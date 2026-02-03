# Deploying to Hugging Face Spaces 🚀

Hugging Face Spaces provides a generous **100% free** tier (2 vCPU, 16GB RAM) that is perfect for this application. Because we are using Docker, we can install all the complex dependencies (FFmpeg, Python) that Vercel doesn't support.

## Step 1: Create a Hugging Face Account
If you don't have one, sign up for free at [huggingface.co/join](https://huggingface.co/join).

## Step 2: Create a New Space
1.  Go to [huggingface.co/new-space](https://huggingface.co/new-space).
2.  **Space Name**: Give it a name (e.g., `yt-chapters-downloader`).
3.  **License**: Choose `MIT`.
4.  **SDK**: Select **Docker** (This is important! 🐳).
5.  **Space Hardware**: Keep it on `Cpu basic • 2 vCPU • 16GB • Free`.
6.  **Visibility**: Choose `Public` or `Private` (your preference).
7.  Click **Create Space**.

## Step 3: Upload Your Files
You can upload files directly through the web interface (easiest):

1.  In your new Space, click on the **Files** tab.
2.  Click **Add file** > **Upload files**.
3.  Drag and drop **ALL** the files from your project folder into the browser window.
    *   *Note: You can skip the `node_modules` and `.next` folders as they are huge and not needed.*
4.  In the "Commit changes" box, type "Initial deploy" and click **Commit changes to main**.

## Step 4: Watch it Build! 🏗️
1.  Click on the **App** tab.
2.  You will see a "Building" status. This first build usually takes **3-5 minutes** because it has to install FFmpeg, Python, and all the libraries.
3.  Once finished, your app will appear live!

## Troubleshooting
- **Build Failed?**: Click the "Logs" tab to see what went wrong.
- **App Crashing?**: Check if the "Port" in the logs matches `7860`. (Our Dockerfile handles this automatically).
