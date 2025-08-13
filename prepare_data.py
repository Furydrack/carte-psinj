
import csv
import requests
import time

# Function to geocode an address using Nominatim API
def geocode_address(address):
    nominatim_url = f"https://nominatim.openstreetmap.org/search?format=json&q={requests.utils.quote(address)}"
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'}
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

    # Convert to CSV export URL (assuming gid=0 for the first sheet)
    google_sheet_csv_url = google_sheet_base_url.replace("/edit?usp=sharing", "/gviz/tq?tqx=out:csv&gid=0")

    print(f"Fetching data from: {google_sheet_csv_url}")

    # Fetch content of Google Sheet
    try:
        response = requests.get(google_sheet_csv_url)
        response.raise_for_status()
        csv_content = response.text
    except requests.exceptions.RequestException as e:
        print(f"Error fetching Google Sheet content: {e}")
        return

    # Parse CSV content
    # Using csv.reader directly as PapaParse is JS-based
    from io import StringIO
    csvfile = StringIO(csv_content)
    reader = csv.reader(csvfile)

    header = next(reader)
    data_rows = list(reader)

    # Prepare new header with Latitude and Longitude
    new_header = header + ["Latitude", "Longitude"]
    processed_data = []

    # Geocode each row
    for i, row in enumerate(data_rows):
        # Assuming 'Adresse* (votre boîte / chez vous / ville, ce sera là que vous serez sur la carte)' is the 6th column (index 5)
        address_column_index = 5
        if len(row) > address_column_index:
            address = row[address_column_index]
            print(f"Geocoding address: {address} (row {i+2})") # +2 for header and 0-indexing
            lat, lon = geocode_address(address)
            row.append(lat if lat is not None else '')
            row.append(lon if lon is not None else '')
        else:
            print(f"Warning: Address column not found for row: {row}")
            row.append('') # Append empty Latitude
            row.append('') # Append empty Longitude
        processed_data.append(row)
        time.sleep(1) # Be polite to Nominatim API, 1 second delay between requests

    # Write processed data to local data.csv
    try:
        with open(output_csv_file, 'w', newline='', encoding='utf-8') as outfile:
            writer = csv.writer(outfile)
            writer.writerow(new_header)
            writer.writerows(processed_data)
        print(f"Successfully wrote geocoded data to {output_csv_file}")
    except IOError as e:
        print(f"Error writing to {output_csv_file}: {e}")

if __name__ == "__main__":
    prepare_data()
