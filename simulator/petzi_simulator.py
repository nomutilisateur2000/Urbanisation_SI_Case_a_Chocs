# Description: This script simulates a petzi webhook request.
#   ____                    _       ____ _
#  / ___|__ _ ___  ___     / \     / ___| |__   ___   ___ ___
# | |   / _` / __|/ _ \   / _ \   | |   | '_ \ / _ \ / __/ __|
# | |__| (_| \__ \  __/  / ___ \  | |___| | | | (_) | (__\__ \
#  \____\__,_|___/\___| /_/   \_\  \____|_| |_|\___/ \___|___/

import argparse
import datetime
import hmac
import requests
import random
import string
import json

def generate_random_string(length=12):
    letters_and_digits = string.ascii_letters + string.digits
    return ''.join(random.choice(letters_and_digits) for i in range(length))


def make_header(body, secret):
    unix_timestamp = str(datetime.datetime.timestamp(datetime.datetime.now())).split('.')[0]
    body_to_sign = f'{unix_timestamp}.{body}'.encode()
    digest = hmac.new(secret.encode(), body_to_sign, "sha256").hexdigest()
    # Set the headers for the POST request
    headers = {'Petzi-Signature': f't={unix_timestamp},v1={digest}', 'Petzi-Version': '2',
               'Content-Type': 'application/json', 'User-Agent': 'PETZI webhook'}
    return headers


def make_post_request(url, data, secret):
    try:
        # Make the POST request
        response = requests.post(url, data=data.encode('utf-8'), headers=make_header(data, secret))

        if response.status_code == 200:
            print(f"Request successful. Response: {response.text}")
        else:
            print(f"Request failed with status code {response.status_code}.")
    except Exception as e:
        print(f"An error occurred: {e}")


if __name__ == "__main__":
    # Create a command line argument parser
    parser = argparse.ArgumentParser(description="HTTP POST Request with JSON Body")
    parser.add_argument("url", type=str, help="URL to send the POST request to")
    parser.add_argument("secret", nargs='?', type=str, help="secret shared between your server and petzi simulator",
                        default="AEeyJhbGciOiJIUzUxMiIsImlzcyI6")

    # Parse the command line arguments
    args = parser.parse_args()

    # Coding horror : Don't Do This at Home!
    data = '''
    {
           "event":"ticket_created",
           "details":{
              "ticket":{
                 "number":"XXXX2941J6SABA",
                 "type":"online_presale",
                 "title":"Test To Delete",
                 "category":"Prélocation",
                 "eventId":54694,
                 "event":"Test To Delete",
                 "cancellationReason":"",
                 "generatedAt": "2024-09-04T10:21:21.925529+00:00",
                 "sessions":[
                    {
                       "name":"Test To Delete",
                       "date":"2024-01-27",
                       "time":"21:00:00",
                       "doors":"21:00:00",
                       "location":{
                          "name":"Case à Chocs",
                          "street":"Quai Philipe Godet 20",
                          "city":"Neuchatel",
                          "postcode":"2000"
                       }
                    }
                 ],
                 "promoter":"Case à Chocs",
                 "price":{
                    "amount":"25.00",
                    "currency":"CHF"
                 }
              },
              "buyer":{
                 "role":"customer",
                 "firstName":"Jane",
                 "lastName":"Doe",
                 "postcode":"1234"
              }
           }
        }
    '''
    data_dict = json.loads(data)
    data_dict["details"]["ticket"]["number"] = generate_random_string()
    data = json.dumps(data_dict, indent=4)
    # Make the POST request
    make_post_request(args.url, data, args.secret)
