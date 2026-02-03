import subprocess
import sys
import time

def run():
    print("Starting Next.js Full Stack App...")
    
    # Start Next.js (Full Stack)
    process = subprocess.Popen(
        ["npm", "run", "dev"],
        shell=True
    )

    try:
        while True:
            time.sleep(1)
            if process.poll() is not None:
                print("App stopped unexpectedly")
                break
    except KeyboardInterrupt:
        print("Stopping app...")
    finally:
        process.terminate()

if __name__ == "__main__":
    run()
