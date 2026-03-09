import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';
import './styles/style.css';
import 'leaflet/dist/leaflet.css';

import * as L from 'leaflet';

const map = L.map('map').setView([49.236, -123.025], 13);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

map.locate({ setView: true, maxZoom: 16 });

function onLocationFound(e) {
    var radius = e.accuracy;

    L.marker(e.latlng).addTo(map);

    L.circle(e.latlng, radius).addTo(map);
}

map.on('locationfound', onLocationFound);

L.Control.MyCustomButton = L.Control.extend({
    options: {
        position: 'bottomleft', // Position the control in the bottom left
    },

    onAdd: function (map) {
        // Create the button element
        let container = L.DomUtil.create('button', 'my-custom-button');
        container.innerHTML = 'My Button';
        container.style.height = '50px';
        container.style.width = '100px';
        container.style.borderRadius = '50px';
        container.style.backgroundColor = 'blue';
        container.style.color = 'white';
        // Add a click event listener
        L.DomEvent.on(container, 'click', function (e) {
            alert('Button clicked!');
            // add on click pop up here
            // Prevent event from propagating to the map
            L.DomEvent.stop(e);
        });

        // Prevent click events on the button from moving the map
        L.DomEvent.disableClickPropagation(container);

        return container;
    },

    onRemove: function (map) {
        // Clean up event listeners if the control is removed
        L.DomEvent.off(this._container, 'click', function () {});
    },
});

// Add the new control to the map
let myCustomButton = new L.Control.MyCustomButton();
myCustomButton.addTo(map);
