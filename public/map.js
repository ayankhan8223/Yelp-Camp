mapboxgl.accessToken = 'pk.eyJ1IjoiYXlhbjgyMjMiLCJhIjoiY2txNnpkYjB3MDE2YTJ3dDhtbmRncWZsYiJ9.Fzb8P6PA0h6EAf2vFz2Vhw';
var map = new mapboxgl.Map({
    container: 'map', // container ID
    style: 'mapbox://styles/mapbox/dark-v10', // style URL
    center: camp.geometry.coordinates, // starting position [lng, lat]
    zoom: 10 // starting zoom
});
map.addControl(new mapboxgl.NavigationControl());

var marker1 = new mapboxgl.Marker()
    .setLngLat(camp.geometry.coordinates)
    .setPopup(
        new mapboxgl.Popup({ offset: 25 })
        .setHTML(
            `<h3>${camp.title}</h3>`
        )
    )
    .addTo(map);
//this all are coming from docs