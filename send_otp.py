import os
import random
import sys
import requests

def generate_otp():
    """Generate a random 6-digit OTP code."""
    return str(random.randint(100000, 999999))

def send_via_twilio(phone_number, otp_code):
    """Send SMS OTP via Twilio API."""
    twilio_sid = os.getenv('TWILIO_SID')
    twilio_token = os.getenv('TWILIO_AUTH_TOKEN')
    twilio_number = os.getenv('TWILIO_NUMBER')

    if not all([twilio_sid, twilio_token, twilio_number]):
        print("[Twilio] Missing environment variables: TWILIO_SID, TWILIO_AUTH_TOKEN, or TWILIO_NUMBER.")
        return False

    # Format to E.164
    formatted_phone = phone_number
    if formatted_phone.startswith('09') and len(formatted_phone) == 11:
        formatted_phone = '+63' + formatted_phone[1:]
    elif formatted_phone.startswith('9') and len(formatted_phone) == 10:
        formatted_phone = '+63' + formatted_phone

    message_body = f"Your Shopply verification code is: {otp_code}. Expires in 10 minutes."
    url = f"https://api.twilio.com/2010-04-01/Accounts/{twilio_sid}/Messages.json"
    
    try:
        response = requests.post(
            url,
            data={
                'To': formatted_phone,
                'From': twilio_number,
                'Body': message_body
            },
            auth=(twilio_sid, twilio_token)
        )
        
        if response.status_code == 201:
            print(f"[Twilio] SMS successfully sent to {formatted_phone}!")
            return True
        else:
            print(f"[Twilio] API Failed with code {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"[Twilio] Error: {e}")
        return False

def send_via_semaphore(phone_number, otp_code):
    """Send SMS OTP via Semaphore API."""
    api_key = os.getenv('SEMAPHORE_API_KEY')
    if not api_key:
        print("[Semaphore] Missing SEMAPHORE_API_KEY environment variable.")
        return False

    message_body = f"Your Shopply verification code is: {otp_code}. Expires in 10 minutes."
    url = "https://api.semaphore.co/api/v4/messages"
    
    try:
        response = requests.post(
            url,
            data={
                'apikey': api_key,
                'number': phone_number,
                'message': message_body
            }
        )
        
        if response.status_code == 200:
            print(f"[Semaphore] SMS successfully sent to {phone_number}!")
            return True
        else:
            print(f"[Semaphore] API Failed with code {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"[Semaphore] Error: {e}")
        return False

def send_via_telegram(phone_number, otp_code):
    """Send OTP via Telegram Bot."""
    bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
    chat_id = os.getenv('TELEGRAM_CHAT_ID')

    if not all([bot_token, chat_id]):
        print("[Telegram] Missing environment variables: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID.")
        return False

    message_body = f"Your Shopply verification code is: {otp_code}. Expires in 10 minutes."
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    
    try:
        response = requests.post(
            url,
            json={
                'chat_id': chat_id,
                'text': message_body
            }
        )
        
        if response.status_code == 200:
            print(f"[Telegram] Message successfully sent to Telegram!")
            return True
        else:
            print(f"[Telegram] API Failed with code {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"[Telegram] Error: {e}")
        return False

def main():
    if len(sys.argv) < 2:
        print("Usage: python send_otp.py <phone_number>")
        print("Example: python send_otp.py 09857982340")
        sys.exit(1)

    phone = sys.argv[1]
    otp = generate_otp()
    print(f"Generated OTP: {otp}")
    print(f"Sending OTP to {phone}...")

    # Attempt Telegram first, then Semaphore, then Twilio
    success = False
    if os.getenv('TELEGRAM_BOT_TOKEN'):
        success = send_via_telegram(phone, otp)

    if not success and os.getenv('SEMAPHORE_API_KEY'):
        success = send_via_semaphore(phone, otp)
    
    if not success and os.getenv('TWILIO_SID'):
        success = send_via_twilio(phone, otp)

    if not success:
        print("\nFailed to send SMS using any configured gateway.")
        print("Please ensure your TELEGRAM_BOT_TOKEN, SEMAPHORE_API_KEY, or TWILIO credentials are set in your environment.")
        sys.exit(1)

if __name__ == '__main__':
    main()
