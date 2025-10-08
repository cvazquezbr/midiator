from playwright.sync_api import sync_playwright, expect, Page

def run_verification(page: Page):
    """
    This script verifies the enhancements made to the BriefingWizard component.
    It now includes console logging to debug client-side application crashes.
    """
    try:
        # Listen for all console events and print them to the terminal
        page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.text}"))

        # 1. Navigate to the app
        print("Navigating to the application...")
        page.goto("http://localhost:5173/", timeout=60000)

        # The script will likely fail here if the app crashes, and the console logs will be key.
        # Let's add a small wait to ensure all initial scripts have run and logged any errors.
        page.wait_for_timeout(5000)

        # 2. Check for a crash indicator instead of a specific button
        # If the app crashes, we won't find the buttons. Let's look for the error message.
        error_message = page.get_by_text("Something went wrong.")
        if error_message.is_visible():
             print("Application has crashed. See console output for details.")
             # We will let the script fail naturally below if it can't find the button,
             # but the console logs will be the important part.

        # If the app didn't crash, proceed with the original verification steps.
        print("Looking for the 'Briefings' button in the main app bar...")
        briefings_button = page.get_by_role("button", name="Briefings")
        expect(briefings_button).to_be_visible(timeout=15000)
        print("Briefings button found. Clicking it.")
        briefings_button.click()

        # 3. Create a new briefing
        print("Looking for the 'Novo Briefing' button...")
        new_briefing_button = page.get_by_role("button", name="Novo Briefing")
        expect(new_briefing_button).to_be_visible()
        print("New briefing button found. Clicking it.")
        new_briefing_button.click()

        # 4. Navigate to the "Entregas" step (Step 5, index 4)
        print("Navigating to the 'Entregas' step...")
        next_button = page.get_by_role("button", name="Próximo")
        for i in range(4):
            print(f"Clicking 'Próximo' ({i+1}/4)...")
            expect(next_button).to_be_enabled()
            next_button.click()
            page.wait_for_timeout(500)

        # 5. Verify the conditional deadline field
        print("Verifying the conditional deadline field...")
        shipment_switch = page.get_by_label("Há envio de produtos para esta entrega?")
        expect(shipment_switch).to_be_visible()

        deadline_field = page.get_by_label("Prazo para envio (dias)")
        expect(deadline_field).not_to_be_visible()

        print("Enabling product shipment switch...")
        shipment_switch.check()

        expect(deadline_field).to_be_visible()
        print("Deadline field is visible as expected.")
        deadline_field.fill("15")
        expect(deadline_field).to_have_value("15")

        # 6. Verify character counters
        print("Verifying character counters...")
        main_message_field = page.get_by_label("Mensagem Principal")
        cta_field = page.get_by_label("CTA (Call to Action)")

        expect(main_message_field).to_be_visible()
        main_message_field.fill("Este é um teste de mensagem.")
        expect(page.get_by_text("27/250")).to_be_visible()
        print("Main message counter is working.")

        expect(cta_field).to_be_visible()
        cta_field.fill("Clique aqui agora!")
        expect(page.get_by_text("17/100")).to_be_visible()
        print("CTA counter is working.")

        # 7. Navigate to the final summary step
        print("Navigating to the final summary step...")
        for i in range(2):
            print(f"Clicking 'Próximo' ({i+1}/2)...")
            expect(next_button).to_be_enabled()
            next_button.click()
            page.wait_for_timeout(500)

        # 8. Verify the final summary content
        print("Verifying the final summary...")
        summary_text_deadline = page.get_by_text("Envio de produtos: Sim, em até 15 dias")
        expect(summary_text_deadline).to_be_visible()
        print("Deadline information is present in the summary.")

        # Take a screenshot
        screenshot_path = "jules-scratch/verification/briefing-wizard-summary.png"
        print(f"Taking screenshot and saving to {screenshot_path}")
        page.screenshot(path=screenshot_path)

    except Exception as e:
        print(f"An error occurred during verification: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")
        raise

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        run_verification(page)
        browser.close()

if __name__ == "__main__":
    main()