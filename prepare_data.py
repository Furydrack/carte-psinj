import csv
import requests
import time

# Function to geocode an address using Nominatim API
def geocode_address(address):
    nominatim_url = f"https://nominatim.openstreetmap.org/search?format=json&q={requests.utils.quote(address)}"
    headers = {'User-Agent': 'MariusMapUpdater/1.0 (marius.boulandet@gmail.com)'}
    try:
        response = requests.get(nominatim_url, headers=headers)
        response.raise_for_status()  # Raise an exception for HTTP errors
        data = response.json()
        if data and len(data) > 0:
            return data[0]['lat'], data[0]['lon']
        else:
            print(f"Warning: Geocoding failed for address: {address}. No results found.")
            return None, None
    except requests.exceptions.RequestException as e:
        print(f"Error geocoding address {address}: {e}")
        return None, None

# Main script logic
def prepare_data():
    google_sheet_url_file = "google_sheet_url.txt"
    output_csv_file = "data.csv"

    # Read Google Sheet URL
    try:
        with open(google_sheet_url_file, 'r') as f:
            google_sheet_base_url = f.read().strip()
    except FileNotFoundError:
        print(f"Error: {google_sheet_url_file} not found.")
        return

    google_sheet_csv_url = google_sheet_base_url.replace("/edit?usp=sharing", "/gviz/tq?tqx=out:csv&gid=0")

    print(f"Fetching data from: {google_sheet_csv_url}")

    try:
        response = requests.get(google_sheet_csv_url)
        response.raise_for_status()
        csv_content = response.text
    except requests.exceptions.RequestException as e:
        print(f"Error fetching Google Sheet content: {e}")
        return

    from io import StringIO
    csvfile = StringIO(csv_content)
    reader = csv.reader(csvfile)

    header = next(reader)
    google_sheet_data = list(reader)

    # Read existing data from data.csv
    existing_data = {}
    existing_header = []
    try:
        with open(output_csv_file, 'r', newline='', encoding='utf-8') as f:
            csv_reader = csv.reader(f)
            existing_header = next(csv_reader)
            for row in csv_reader:
                if len(row) >= 2: # Ensure row has at least two columns for Prénom* and Nom*
                    # Use a combination of Prénom and Nom as a unique key
                    # Assuming 'Prénom*' is at index 0 and 'Nom*' is at index 1 in existing_header
                    prenom_idx = existing_header.index('Prénom*') if 'Prénom*' in existing_header else 0
                    nom_idx = existing_header.index('Nom*') if 'Nom*' in existing_header else 1
                    
                    key = (row[prenom_idx], row[nom_idx]) 
                    existing_data[key] = {existing_header[i]: val for i, val in enumerate(row)}
                else:
                    print(f"Warning: Skipping malformed row in {output_csv_file}: {row}")
    except FileNotFoundError:
        print("data.csv not found, creating a new one.")
        existing_header = header + ["Latitude", "Longitude"]


    # Prepare new header with Latitude and Longitude
    new_header = header + ["Latitude", "Longitude"]
    processed_data = []
    data_changed = False

    # Geocode each row
    for i, row in enumerate(google_sheet_data):
        row_dict = {header[i]: val for i, val in enumerate(row)}
        key = (row_dict.get('Prénom*'), row_dict.get('Nom*'))
        address = row_dict.get('Adresse*')

        if key in existing_data:
            # Row exists, check if address has changed
            if address != existing_data[key].get('Adresse*'):
                print(f"Address changed for {key[0]} {key[1]}. Geocoding new address: {address}")
                lat, lon = geocode_address(address)
                row.append(lat if lat is not None else '')
                row.append(lon if lon is not None else '')
                data_changed = True
            else:
                # Address is the same, use existing coordinates
                row.append(existing_data[key].get('Latitude', ''))
                row.append(existing_data[key].get('Longitude', ''))
        else:
            # New row, geocode address
            print(f"New entry found for {key[0]} {key[1]}. Geocoding address: {address}")
            lat, lon = geocode_address(address)
            row.append(lat if lat is not None else '')
            row.append(lon if lon is not None else '')
            data_changed = True
        
        processed_data.append(row)
        time.sleep(1) # Be polite to Nominatim API

    if data_changed or len(google_sheet_data) != len(existing_data):
        try:
            with open(output_csv_file, 'w', newline='', encoding='utf-8') as outfile:
                writer = csv.writer(outfile)
                writer.writerow(new_header)
                writer.writerows(processed_data)
            print(f"Successfully wrote geocoded data to {output_csv_file}")
        except IOError as e:
            print(f"Error writing to {output_csv_file}: {e}")
    else:
        print("No changes detected in the data. File not updated.")

if __name__ == "__main__":
    prepare_data()