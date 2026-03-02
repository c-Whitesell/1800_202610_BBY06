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
