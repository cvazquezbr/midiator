from playwright.sync_api import sync_playwright, expect

def run_verification(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Log in - Bypassing UI login due to persistent selector issues
        page.goto("http://localhost:5173/")
        page.evaluate("() => localStorage.setItem('user', JSON.stringify({ email: 'user@example.com', uuid: 'test-uuid' }))")
        page.reload()

        # Directly navigate to the briefings view
        page.evaluate("() => { const mainAppBar = document.querySelector('#main-app-bar'); if (mainAppBar) { mainAppBar.dispatchEvent(new CustomEvent('setView', { detail: 'briefings' })); } }")

        # Open the Briefing Wizard
        # Adding a wait to ensure the view has changed
        expect(page.get_by_role("button", name="Novo Briefing")).to_be_visible()
        page.get_by_role("button", name="Novo Briefing").click()

        # Verify the Stepper is visible with 7 steps
        stepper = page.locator(".MuiStepper-root")
        expect(stepper).to_be_visible()
        steps = stepper.locator(".MuiStep-root")
        expect(steps).to_have_count(7)

        # Verify the initial step is "Motivação"
        expect(page.get_by_text("Qual é a principal motivação da sua campanha?")).to_be_visible()
        page.screenshot(path="jules-scratch/verification/01_briefing_wizard_step1.png")

        # Navigate to Step 4: Inspiração
        page.get_by_role("button", name="Próximo").click() # Step 2
        page.get_by_role("button", name="Próximo").click() # Step 3
        page.get_by_role("button", name="Próximo").click() # Step 4

        # Verify Step 4 is "Inspiração"
        expect(page.get_by_role("heading", name="Inspirações")).to_be_visible()
        page.screenshot(path="jules-scratch/verification/02_briefing_wizard_step4.png")

        # Navigate to Step 5: Entregas
        page.get_by_role("button", name="Próximo").click() # Step 5

        # Verify Step 5 is "Entregas"
        expect(page.get_by_role("heading", name="Entregas")).to_be_visible()
        page.screenshot(path="jules-scratch/verification/03_briefing_wizard_step5.png")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run_verification(playwright)