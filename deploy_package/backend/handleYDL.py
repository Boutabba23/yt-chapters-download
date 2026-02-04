# TODO: create an object with the functions as methods, so the preferences, like use_cli, can be defined only once

from yt_dlp import YoutubeDL
import subprocess

DEFAULT_CLI_PATH = "yt-dlp"

def download( url, ydl_opts=None, use_cli=False, cli_path=DEFAULT_CLI_PATH ):
    
    if ydl_opts is None: ydl_opts = {}
    # Aggressive DNS/Networking fixes
    ydl_opts.setdefault('force_ipv4', True)
    ydl_opts.setdefault('nocheckcertificate', True)
    ydl_opts.setdefault('socket_timeout', 30)
    ydl_opts.setdefault('user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')
    
    if not use_cli:
        with YoutubeDL( ydl_opts ) as ydl:
            ydl.prepare_filename( ydl.extract_info( url ) )
            try:
                ydl.download( [ url ] )
            except:
                return False
    else:
        try:
            outtmpl = ydl_opts['outtmpl']
        except:
            outtmpl = ''
        result = subprocess.run( [ cli_path, url, '-o', outtmpl ], capture_output=True, encoding='UTF-8' )
    
    return True

def get_infos( url, ydl_opts=None, use_cli=False, cli_path=DEFAULT_CLI_PATH ):
    
    infos = {}

    if ydl_opts is None: ydl_opts = {}
    # Aggressive DNS/Networking fixes
    ydl_opts.setdefault('force_ipv4', True)
    ydl_opts.setdefault('nocheckcertificate', True)
    ydl_opts.setdefault('socket_timeout', 30)
    ydl_opts.setdefault('user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')

    if not use_cli:
        with YoutubeDL(ydl_opts) as ydl:
            extracted_infos = ydl.extract_info( url, download=False )
            infos = { 
                'title': extracted_infos.get('title'),
                'description': extracted_infos.get('description'),
                'duration': extracted_infos.get('duration'),
                'thumbnail': extracted_infos.get('thumbnail'),
                'thumbnails': extracted_infos.get('thumbnails'),
                'filesize': extracted_infos.get('filesize'),
                'filesize_approx': extracted_infos.get('filesize_approx'),
                'requested_formats': extracted_infos.get('requested_formats'),
                'format': extracted_infos.get('format')
            }
    else:
        infos['title'] = subprocess.run( [cli_path, url, '--get-title'], capture_output=True, encoding='UTF-8' )
        infos['description'] = subprocess.run( [cli_path, url, '--get-description'], capture_output=True, encoding='UTF-8' )
        infos['duration'] = subprocess.run( [cli_path, url, '--get-duration'], capture_output=True, encoding='UTF-8' )
    
    return infos

def prepare_filename( url, ydl_opts=None, use_cli=False, cli_path=DEFAULT_CLI_PATH ):
    
    infos = get_infos( url, use_cli, cli_path )

    if ydl_opts is None: ydl_opts = {}
    # Aggressive DNS/Networking fixes
    ydl_opts.setdefault('force_ipv4', True)
    ydl_opts.setdefault('nocheckcertificate', True)
    ydl_opts.setdefault('socket_timeout', 30)
    ydl_opts.setdefault('user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')

    if not use_cli:
        with YoutubeDL( ydl_opts ) as ydl:
            ydl.prepare_filename( infos )
    else:
        subprocess.run( [cli_path, url, '--get-filename', '-o', ydl_opts['outtmpl'] ],
            capture_output=True, encoding='UTF-8' )

if __name__ == '__main__':
    
    url = 'https://www.youtube.com/watch?v=WifI7lOUI-o'

    print( get_filename(url, {'outtmpl':'%(title)s'} ) )
