// 1. Create the map and set the initial view to show all of France
var map = L.map('map').setView([46.603354, 1.888334], 6);

// 2. Add the OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Define a custom icon
var customIcon = L.icon({
    iconUrl: 'PopupCustomVisual/Marius_Boulandet.png',
    iconSize: [38, 38], // size of the icon
    iconAnchor: [19, 38], // point of the icon which will correspond to marker's location
    popupAnchor: [0, -38] // point from which the popup should open relative to the iconAnchor
});

// 3. Function to add a marker to the map
function addMarker(data, lat, lon) {
    const marker = L.marker([lat, lon], { icon: customIcon }).addTo(map);

    const pseudo = data['Pseudo (ce qui sera affiché sur la carte'] || '';
    const prenom = data['Prénom'] || '';
    const nom = data['Nom'] || '';
    const companyName = data['Company name'] || 'Company';
    const companyLink = data['Company link'] || '#';

    const popupContent = `
        <b>${pseudo}</b><br>
        ${prenom} ${nom}<br>
        <a href="${companyLink}" target="_blank">${companyName}</a>
    `;

    marker.bindPopup(popupContent, { className: 'custom-popup' });

    // Add a click event listener to the marker to zoom in
    marker.on('click', function () {
        map.setView([lat, lon], 15);
    });
}

// 4. Hardcoded POI data from data.csv
addMarker({
    'Prénom': 'Marius',
    'Nom': 'Boulandet',
    'Pseudo (ce qui sera affiché sur la carte': 'Furydrack',
    'Adresse précise': '17 rue Jean Poncelet, Dijon (21000)',
    'Company name': 'Da Viking Code',
    'Company link': 'https://www.google.com/url?sa=t&rct=j&q=&esrc=s&source=web&cd=&cad=rja&uact=8&ved=2ahUKEwiJvebP6PWOAxUDZaQEHdecDAMQFnoECB8QAQ&url=https%3A%2F%2Fdavikingcode.com%2F&usg=AOvVaw1Hm86Vn0yEHnvjRxGul5jS&opi=89978449'
}, 47.3406612, 5.0427426);