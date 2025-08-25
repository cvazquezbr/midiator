import re
from playwright.sync_api import sync_playwright, Page, expect

def run_verification(page: Page):
    """
    This script verifies the image generation flow based on the user's detailed instructions.
    """
    # Navigate to the root of the application
    print("Navigating to the application...")
    page.goto("http://localhost:5173/")

    print("Taking screenshot of initial page...")
    page.screenshot(path="jules-scratch/verification/00_initial_page_v2.png")

    # 1. Select "Posts curtos"
    print("Selecting 'Posts curtos'...")
    # This seems to be a main step/tab on the page.
    page.get_by_role("button", name="Posts Curtos").click()

    # 2. Select "2 posts" on a slider
    print("Setting the number of posts to 2...")
    # The user mentioned a slider. Let's assume it's an input with role 'slider'.
    # Or it might be a text field for the number of posts. Let's try to find it by label.
    # From previous analysis, it's likely a text field.
    page.get_by_label("Número de Posts").fill("2")

    # 3. Fill "Descrição do Conteúdo"
    print("Filling in the content description...")
    page.get_by_label("Descrição do Conteúdo").fill("Jules")

    # 4. Activate the switch
    print("Activating the automatic background generation switch...")
    page.get_by_label("Gerar imagens de fundo automaticamente para cada post").check()

    # 5. Press "Gerar Conteúdo com IA"
    print("Generating AI content...")
    page.get_by_role("button", name="Gerar Conteúdo com IA").click()

    # Wait for some indication that the content has been generated.
    # This is a bit of a guess, but let's wait for the "Gerar Imagens" button to become enabled or visible.
    generate_images_button = page.get_by_role("button", name="Gerar Imagens")
    expect(generate_images_button).to_be_enabled(timeout=120000) # Wait up to 2 minutes

    # 6. Press "Gerar Imagens" on the sidebar
    print("Generating the final images...")
    generate_images_button.click()

    # 7. Verify the generated images
    print("Waiting for image list to appear...")
    first_image_locator = page.locator('img[alt="Preview 1"]').first
    expect(first_image_locator).to_be_visible(timeout=180000)

    print("Taking screenshot of the initial image list...")
    page.screenshot(path="jules-scratch/verification/01_final_list_v2.png")

    print("Opening the editor for the first image...")
    page.locator('div:has(> img[alt="Preview 1"])').first.click()

    editor_locator = page.locator('.MuiDialog-container[role="dialog"] .MuiPaper-root')
    expect(editor_locator).to_be_visible()

    print("Taking screenshot of the editor...")
    page.screenshot(path="jules-scratch/verification/02_editor_view_v2.png")

    print("Saving changes from the editor...")
    editor_locator.get_by_role("button", name="Salvar e Regenerar").click()
    expect(editor_locator).not_to_be_visible()

    print("Taking final screenshot of the list after save...")
    page.screenshot(path="jules-scratch/verification/03_final_list_after_save_v2.png")

    print("Verification script v2 completed successfully!")


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
