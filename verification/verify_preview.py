
import os
from playwright.sync_api import sync_playwright, expect

def run_verification(page):
    # Set a generous timeout for the entire test
    page.set_default_timeout(60000)

    try:
        # Navigate to the login page
        page.goto("http://localhost:5178/login")

        # Perform login
        page.get_by_label("Email").fill("test@test.com")
        page.get_by_label("Senha").fill("password")
        page.get_by_role("button", name="Entrar").click()

        # Wait for navigation to the main page and for the 'PageSets' button to be visible
        expect(page.get_by_role("heading", name="Campanhas")).to_be_visible()

        # Navigate to PageSets
        page.get_by_role("button", name="Conjuntos de Páginas").click()
        expect(page.get_by_role("heading", name="Conjuntos de Páginas")).to_be_visible()

        # Click the first PageSet in the list to select it
        page.locator('.MuiDrawer-paper .MuiListItemButton').first.click()

        # Click the 'Adicionar Página' button
        page.get_by_role("button", name="Adicionar Página").click()

        # Wait for the PageEditor dialog to appear
        dialog = page.get_by_role("dialog", name="Editar Página #1")
        expect(dialog).to_be_visible()

        # Wait for the preview area to be stable and visible
        preview_area = dialog.locator('div[class*="FieldPositioner"]')
        expect(preview_area).to_be_visible()

        # Take a screenshot
        screenshot_path = "/app/verification/page_editor_preview.png"
        os.makedirs(os.path.dirname(screenshot_path), exist_ok=True)
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

    except Exception as e:
        print(f"An error occurred: {e}")
        # Take a screenshot on error for debugging
        error_screenshot_path = "/app/verification/error_screenshot.png"
        os.makedirs(os.path.dirname(error_screenshot_path), exist_ok=True)
        page.screenshot(path=error_screenshot_path)
        print(f"Error screenshot saved to {error_screenshot_path}")


if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            run_verification(page)
        finally:
            browser.close()
