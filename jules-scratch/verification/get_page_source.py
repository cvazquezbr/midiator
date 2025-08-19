from playwright.sync_api import sync_playwright, expect
import time

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            # 1. Navigate to the app
            page.goto("http://localhost:5173/", wait_until="networkidle")
            time.sleep(5) # wait for page to load

            # Get page source
            source = page.content()
            with open("jules-scratch/verification/page_source.html", "w") as f:
                f.write(source)

            print("Saved page source to jules-scratch/verification/page_source.html")

        except Exception as e:
            print(f"An error occurred: {e}")
            page.screenshot(path="jules-scratch/verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    run_verification()
