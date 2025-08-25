import re
from playwright.sync_api import sync_playwright, Page, expect

def run_verification(page: Page):
    """
    This script verifies the entire image generation and editing flow to ensure
    background images are correctly handled.
    """
    # 1. Login
    print("Navigating to login page...")
    page.goto("http://localhost:5173/login")

    print("Entering credentials for teste@teste.com...")
    page.get_by_label("Email Address *").fill("teste@teste.com")
    page.get_by_label("Password *").fill("teste1234")

    print("Clicking login button...")
    page.locator('button[type="submit"]:has-text("Sign In")').click()

    # Wait for navigation to the main page by checking for a known element
    print("Waiting for main page to load...")
    # After login, the main app bar should be visible. We'll wait for the settings icon.
    settings_button = page.locator('button[aria-label="settings"]')
    expect(settings_button).to_be_visible(timeout=15000)

    # 2. Set Gemini API Key
    print("Navigating to settings to set API key...")
    settings_button.click()

    # The setup modal opens. Navigate to the Gemini tab.
    page.get_by_role("tab", name="Gemini").click()

    print("Entering Gemini API key...")
    api_key_input = page.get_by_label("Google Gemini API Key")
    api_key_input.fill("AIzaSyBSsqpQZLeaLzJp-cpJI3fOr5Z-TkkZe-U")

    print("Saving settings...")
    page.get_by_role("button", name="Salvar e Fechar").click()
    # Wait for the modal to disappear
    expect(page.get_by_role("tab", name="Gemini")).not_to_be_visible()

    # 3. Navigate to "Posts Curtos"
    print("Navigating to 'Posts Curtos' step...")
    sidebar_button = page.locator('button[aria-label*="Abrir barra lateral"]')
    if sidebar_button.is_visible():
        print("Opening sidebar...")
        sidebar_button.click()

    page.get_by_role("button", name="Posts Curtos").click()

    # 4. Use AI Generation
    print("Configuring AI generation...")
    page.get_by_role("tab", name="Gerar com IA").click()
    page.get_by_label("Descreva o que você precisa").fill("Crie 3 posts sobre os benefícios de beber água.")
    page.get_by_label("Gerar imagens automaticamente").check()

    print("Starting AI generation...")
    page.get_by_role("button", name="Gerar Posts").click()

    # 5. Verify Image List (after generation)
    print("Waiting for image generation to complete...")
    first_image_locator = page.locator('img[alt="Preview 1"]').first
    expect(first_image_locator).to_be_visible(timeout=180000)

    print("Taking screenshot of the initial image list...")
    page.screenshot(path="jules-scratch/verification/01_initial_list.png")

    # 6. Verify Editor Background
    print("Opening the editor for the first image...")
    page.locator('div:has(> img[alt="Preview 1"])').first.click()

    editor_locator = page.locator('.MuiDialog-container[role="dialog"] .MuiPaper-root')
    expect(editor_locator).to_be_visible()

    print("Taking screenshot of the editor...")
    page.screenshot(path="jules-scratch/verification/02_editor_view.png")

    # 7. Save and Verify List Again
    print("Saving changes from the editor...")
    editor_locator.get_by_role("button", name="Salvar e Regenerar").click()
    expect(editor_locator).not_to_be_visible()

    print("Taking final screenshot of the list...")
    page.screenshot(path="jules-scratch/verification/03_final_list.png")

    print("Verification script completed successfully!")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            run_verification(page)
        finally:
            browser.close()

if __name__ == "__main__":
    main()
