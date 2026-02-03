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

## Step 3: Bundle and Upload Files
The error you saw earlier happens because the browser can't read hidden system files (like `.git`) or locked folders. I've made a script to fix this!

1.  **Run the Preparation Script**:
    *   Open your terminal in the project folder.
    *   Type: `.\prepare_deploy.ps1` and hit Enter.
    *   This will create a new folder called **`deploy_package`** with *only* the safe files.

2.  **Upload to Hugging Face**:
    *   In your Space, click **Files** > **Add file** > **Upload files**.
    *   Open the `deploy_package` folder on your computer.
    *   Select **ALL** the files inside it and drag them into the browser.
    *   Commit changes.

## Step 4: Watch it Build! 🏗️
1.  Click on the **App** tab.
2.  You will see a "Building" status. This first build usually takes **3-5 minutes** because it has to install FFmpeg, Python, and all the libraries.
3.  Once finished, your app will appear live!

## Troubleshooting
- **Build Failed?**: Click the "Logs" tab to see what went wrong.
- **App Crashing?**: Check if the "Port" in the logs matches `7860`. (Our Dockerfile handles this automatically).
