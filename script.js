// 1. Create the map and set the initial view to show all of France
var map = L.map('map', { worldCopyJump: false, minZoom: 2 }).setView([46.603354, 1.888334], 6);

// 2. Add the OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    noWrap: true
}).addTo(map);

// Define a default Leaflet icon
const defaultLeafletIcon = new L.Icon.Default();

// Function to get the appropriate icon for a marker
function getMarkerIcon(data) {
    const first_name = data['Prénom*'] || '';
    const last_name = data['Nom'] || '';
    const customIconPath = `PopupCustomVisual/${first_name}_${last_name}.png`;
    
    // Create a temporary image to check if the custom icon exists
    const img = new Image();
    img.src = customIconPath;

    return L.icon({
        iconUrl: img.complete && img.naturalHeight !== 0 ? customIconPath : 'PopupCustomVisual/default.png',
        iconSize: [50, 50], // size of the icon
        iconAnchor: [25, 50], // point of the icon which will correspond to marker's location
        popupAnchor: [0, -50], // point from which the popup should open relative to the iconAnchor
        tooltipAnchor: [0, -3] // Align tooltip with popupAnchor for custom icon
    });
}

// Global array to store marker data for the HUD
const allMarkersData = [];

// 3. Function to add a marker to the map
function addMarker(data, lat, lon) {
    const markerIcon = getMarkerIcon(data); // Get the appropriate icon
    const marker = L.marker([lat, lon], { icon: markerIcon }).addTo(map);

    const first_name = data['Prénom*'] || '';
    const last_name = data['Nom'] || '';
    const pseudo = data['Pseudo'] || '';
    const description = data['Description'] || '';
    const birth = data['Anniversaire'] || '';
    const role = data['Rôle*'] || '';
    const location = data['Adresse*'] || '';
    const companyName = data['Boîte'] || '';
    const companyLink = data['Lien de la boîte'] || '';

    // Extract city from address (simple approach, might need refinement for complex addresses)
    let city = 'Unknown City';
    const cityMatch = location.match(/([A-Za-zÀ-ÿ\s-]+)(?: (\d{5}))?$/);
    if (cityMatch && cityMatch[1]) {
        city = cityMatch[1].trim();
    } else if (location) { // If it's just a city name
        city = location.trim();
    }

    const popupContent = `
        <b>${pseudo || (last_name ? `${first_name} ${last_name.charAt(0)}.` : first_name)}</b><br>
        ${(pseudo ? `${first_name} ${last_name}<br>` : '')}
        ${companyLink ? `<a href="${companyLink}" target="_blank">${companyName}</a>` : companyName}<br>
        ${description ? `<br><i>${description}</i><br>` : ''}
    `;

    const popupOptions = { className: 'custom-popup' };
    if (role === 'PSINJ') {
        popupOptions.className += ' psinj-popup';
    }
    else if (role === 'Légende') {
        popupOptions.className += ' legende-popup';
    }
    else if (role == 'Saïmiri') {
        popupOptions.className += ' saimiri-popup';
    }

    marker.bindPopup(popupContent, popupOptions);

    // Display pseudo under the marker
    const tooltipOptions = { permanent: true, direction: 'bottom' };
    if (role === 'PSINJ') {
        tooltipOptions.className = 'psinj-tooltip';
    }
    else if (role === 'Légende') {
        tooltipOptions.className = 'legende-tooltip';
    }
    else if (role === 'Saïmiri') {
        tooltipOptions.className = 'saimiri-tooltip';
    }
    
    marker.bindTooltip(pseudo || (last_name.length > 0 ? `${first_name} ${last_name.charAt(0)}.` : first_name), tooltipOptions).openTooltip();

    // Add a click event listener to the marker to zoom in
    marker.on('click', function () {
        map.setView([lat, lon], 15);
    });

    // Store marker data for the HUD
    allMarkersData.push({
        pseudo: pseudo || (last_name.length > 0 ? `${first_name} ${last_name.charAt(0)}.` : first_name), // Use pseudo or generated initial
        city: city,
        birth: birth,
        lat: lat,
        lon: lon,
        marker: marker, // Store reference to the Leaflet marker object
        companyName: companyName,
        companyLink: companyLink,
        description: description,
        role: role,
        prenom: first_name,
        nom: last_name
    });
}

// Function to update the marker list HUD
function updateMarkerListHUD() {
    const markersUl = document.getElementById('markers-ul');
    markersUl.innerHTML = ''; // Clear existing list

    // Sort markers by pseudo alphabetically
    const sortedMarkers = [...allMarkersData].sort((a, b) => {
        return a.pseudo.localeCompare(b.pseudo);
    });

    sortedMarkers.forEach(markerData => {
        const listItem = document.createElement('li');
        if (markerData.role === 'PSINJ') {
            listItem.classList.add('psinj-role');
        }
        else if (markerData.role === 'Légende') {
            listItem.classList.add('legende-role');
        }
        else if (markerData.role === 'Saïmiri') {
            listItem.classList.add('saimiri-role');
        }
        // Use the actual icon URL from the marker for the HUD list
        const iconUrlForHud = markerData.marker.options.icon.options.iconUrl || defaultLeafletIcon.options.iconUrl;
        listItem.innerHTML = `
            <img src="${iconUrlForHud}" alt="Marker Icon">
            <div class="marker-info">
                <strong>${markerData.pseudo}</strong><br>
                <span>👤 ${markerData.prenom} ${markerData.nom} [${markerData.role}]</span><br>
                ${markerData.birth ? `🎂 <span>${markerData.birth}${(markerData.birth.split('/').length <= 2 ? '' : ` - ${calculateAge(markerData.birth, getToday())} ans`)}</span><br>` : ''} 
                <span>📍 ${markerData.city} ${markerData.companyName ? `- <a href="${markerData.companyLink}" target="_blank">${markerData.companyName}</a>` : ''}</span>
                ${markerData.description ? `<br><i>${markerData.description}</i>` : ''}
            </div>
        `;
        listItem.addEventListener('click', () => {
            map.setView([markerData.lat, markerData.lon], 15); // Zoom to marker
            markerData.marker.openPopup(); // Open popup on click
        });
        markersUl.appendChild(listItem);
    });
}

// Function to fetch and process the CSV data
function loadMarkersFromCSV() {
    Papa.parse('data.csv', {
        download: true,
        header: true,
        complete: function(results) {
            const data = results.data;
            data.slice(0,-1).forEach(row => {
                const lat = parseFloat(row.Latitude);
                const lon = parseFloat(row.Longitude);
                if (!isNaN(lat) && !isNaN(lon)) {
                    addMarker(row, lat, lon);
                }
                else {
                    console.warn(`Could not find valid coordinates (Latitude, Longitude) for row: ${JSON.stringify(row)}`);
                }
            });
            updateMarkerListHUD();
        }
    });
}

// Function to get today's date in format dd/mm/yyyy
function getToday() {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');       // jour sur 2 chiffres
  const month = String(today.getMonth() + 1).padStart(2, '0'); // mois sur 2 chiffres (0 = janvier)
  const year = today.getFullYear();

  return `${day}/${month}/${year}`;
}

// Function to get the age of someone based on his birthday and another date (format dd/mm/yyyy)
function calculateAge(birthDateStr, compDateStr) {
  const [day0, month0, year0] = birthDateStr.split('/').map(Number);
  const birthDate = new Date(year0, month0 - 1, day0);

  const [day1, month1, year1] = compDateStr.split('/').map(Number);
  const compDate = new Date(year1, month1 - 1, day1);
  let age = compDate.getFullYear() - birthDate.getFullYear();

  // Si on n’a pas encore fêté l’anniversaire cette année
  const m = compDate.getMonth() - birthDate.getMonth();
  const d = compDate.getDate() - birthDate.getDate();
  if (m < 0 || (m === 0 && d < 0)) {
    age--;
  }

  return age;
}

// Load the markers from the CSV file
loadMarkersFromCSV();

// Add a button to reset the view
const resetButton = L.control({ position: 'topright' });
resetButton.onAdd = function (map) {
    const div = L.DomUtil.create('div', 'reset-view-btn');
    div.innerHTML = '<button>Reset View</button>';
    div.firstChild.addEventListener('click', () => {
        map.setView([46.603354, 1.888334], 6);
    });
    return div;
};
resetButton.addTo(map);