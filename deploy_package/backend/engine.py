#! /usr/bin/env python3
# -*- coding: utf-8 -*-

# TODO: change working location to be a temp dir
# TODO: Add option for mkv

import subprocess, os, argparse, datetime, re, sys
from pathlib import Path
from yt_dlp import YoutubeDL
from handleYDL import *

USE_CLI = False
CLI_PATH = 'yt-dlp'

def get_default_download_dir():
    if os.name == 'nt':
        import winreg
        sub_key = r'SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Shell Folders'
        downloads_guid = '{374DE290-123F-4565-9164-39C4925E467B}'
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, sub_key) as key:
            location = winreg.QueryValueEx(key, downloads_guid)[0]
        return Path(location)
    else:
        return Path.home() / "Downloads"

def add_chapters_to_mp4(chapter_file_path:Path, video_file_path:Path)->None:

    # Use MP4Box to mux the chapter file with the mp4
    subprocess.run(["MP4Box", "-chap", str(chapter_file_path), str(video_file_path)])

def get_chapters( chapters_str:str )->list:

    # Read the description file
    # Split into time and chapter name

    list_of_chapters = []

    # only increment chapter number on a chapter line
    # chapter lines start with timecode
    line_counter = 1
    for line in chapters_str.split('\n'):
        result = re.search(r"\(?(\d?[:]?\d+[:]\d+)\)?", line)
        try:
            # result = re.search("\(?(\d+[:]\d+[:]\d+)\)?", line)
            time_count = datetime.datetime.strptime(result.group(1), '%H:%M:%S')
        except:
            try:
                # result = re.search("\(?(\d+[:]\d+)\)?", line)
                time_count = datetime.datetime.strptime(result.group(1), '%M:%S')
            except:
                continue
        chap_name = line.replace(result.group(0),"").rstrip(' :\n')
        # Filter out characters that might be problematic for filenames
        chap_name = re.sub(r'[\\/*?:"<>|]', "", chap_name)
        chap_pos = datetime.datetime.strftime(time_count, '%H:%M:%S')
        list_of_chapters.append((str(line_counter).zfill(2), chap_pos, chap_name))
        line_counter += 1

    return list_of_chapters

def write_chapters_file(chapter_file_path:Path, chapter_list:tuple)->None:

    #open(chapter_file, 'w').close()

    # Write out the chapter file based on simple MP4 format (OGM)
    with open(chapter_file_path, 'w', encoding='utf-8') as fo:
        for current_chapter in chapter_list:
            fo.write(f'CHAPTER{current_chapter[0]}='
                    f'{current_chapter[1]}\n'
                    f'CHAPTER{current_chapter[0]}NAME='
                    f'{current_chapter[2]}\n')


def split_media(chapters:list, download_filename:Path, download_name:str, out_dir:Path, selected_indices:list=None, is_audio=False)->None:
    current_duration_pretext = subprocess.run(['ffprobe', '-i', str(download_filename),
                                       '-show_entries', 'format=duration',
                                       '-v', 'quiet'],
                                        capture_output=True, encoding='UTF8')
    try:
        current_duration = float(current_duration_pretext.stdout[18:-13])
    except:
        match = re.search(r'duration=([\d.]+)', current_duration_pretext.stdout)
        if match:
            current_duration = float(match.group(1))
        else:
            print("Could not determine media duration. Skipping split.")
            return

    m, s = divmod(current_duration, 60)
    h, m = divmod(m, 60)
    current_dur = ':'.join([str(int(h)),str(int(m)),str(s)])
    
    ext = ".mp3" if is_audio else ".mp4"
    
    for current_index, current_chapter in enumerate(chapters):
        if selected_indices is not None and (current_index + 1) not in selected_indices:
            continue

        next_index = current_index + 1
        start_time = current_chapter[1]
        try:
            end_time = chapters[next_index][1]
        except:
            end_time = current_dur
        
        output_name = out_dir / f'{current_chapter[0]} - {current_chapter[2]}{ext}'
        
        codec_args = ["-acodec", "libmp3lame"] if is_audio else ["-acodec", "copy", "-vcodec", "copy"]
        
        cmd = ["ffmpeg", "-ss", start_time, "-to", end_time, "-i", str(download_filename)] + codec_args + [str(output_name)]
        subprocess.run(cmd)

def run_engine(links, quality="bestvideo[height<=1080]+bestaudio/best[height<=1080]", split=False, selected_chapters=None, outdir="", audio_only=False, test=False, fix=False, use_cli=False, cli_path="yt-dlp", progress_callback=None):
    base_out_dir = Path(outdir) if outdir else get_default_download_dir()
    
    results = []

    for index in range(0, len(links)):
        link_to_download = links[index]
        options = {}
        
        temp_options = {'quiet': True}
        infos = get_infos(link_to_download, temp_options, use_cli, cli_path)
        
        download_name = infos['title']
        download_name = re.sub(r'[\\/*?:"<>|]', "", download_name)
        
        video_out_dir = base_out_dir / download_name
        video_out_dir.mkdir(parents=True, exist_ok=True)
        
        ext = "mp3" if audio_only else "mp4"
        download_filename = video_out_dir / f'{download_name}.{ext}'
        chapter_file = video_out_dir / f'{download_name}_chapter.txt'
        description = infos['description']

        chapters = get_chapters(description)

        options['outtmpl'] = str(video_out_dir / '%(title)s.%(ext)s')
        
        if audio_only:
            options['format'] = 'bestaudio/best'
            options['postprocessors'] = [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }]
        else:
            options['merge_output_format'] = "mp4"
        
        if progress_callback:
            options['progress_hooks'] = [progress_callback]

        if test:
            options['format'] = "worstvideo[ext=mp4]+worstaudio[ext=m4a]/mp4"
        else:
            if not audio_only:
                options['format'] = quality
            
        download(link_to_download, options, use_cli, cli_path)
        
        if not download_filename.exists():
            matches = list(video_out_dir.glob(f"{download_name}*.{ext}"))
            if matches:
                download_filename = matches[0]
            else:
                results.append({"status": "error", "title": download_name, "message": "File not found after download"})
                continue

        if not chapters:
            results.append({"status": "success", "title": download_name, "chapters": False})
        else:
            write_chapters_file(chapter_file_path=chapter_file, chapter_list=chapters)

            if split:
                split_media(chapters=chapters, download_filename=download_filename,
                          download_name=download_name, out_dir=video_out_dir, 
                          selected_indices=selected_chapters, is_audio=audio_only)
            
            if not audio_only:
                add_chapters_to_mp4(chapter_file_path=chapter_file,
                                      video_file_path=download_filename)

            if chapter_file.exists():
                os.remove(chapter_file)
            
            results.append({"status": "success", "title": download_name, "chapters": True})
            
    return results

if __name__ == '__main__':

    args = get_args()
    
    run_engine(
        links=args.links,
        quality=args.quality,
        split=args.split,
        outdir=args.outdir,
        test=args.test,
        fix=args.fix,
        use_cli=args.use_cli,
        cli_path=args.cli_path
    )
