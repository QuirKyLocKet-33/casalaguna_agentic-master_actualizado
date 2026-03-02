import requests

phone_number_id = "894525647087417"
token = "EAAXTubXdiPQBQtPlHyoQCw1DLSVZCJ7MkVr8OAimReeU3cQ3r5UY7MydvvYn4ZCUIZCoezq1ZAGYd2SYayOlzn3vFc2CiQxi1ZCRNZCjfLWVZAIJRWFCckSuQXR5YC6CUxU3CgMEyW2oCbId7jwBobRpsZB9c4RB2zkn5TvZCvrQmJMFKtpoWMUF6jTCeyzrZAOZAhl2QZDZD"

url = f"https://graph.facebook.com/v18.0/{phone_number_id}/register"

data = {
    "messaging_product": "whatsapp",
    "pin": "123456"
}

headers = {
    "Authorization": f"Bearer {token}"
}

response = requests.post(url, json=data, headers=headers)

print(response.json())
