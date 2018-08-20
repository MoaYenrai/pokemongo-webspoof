import axios from 'axios'

import React, {Component} from 'react'
import {action, observable} from 'mobx'
import {observer} from 'mobx-react'
import Alert from 'react-s-alert'
import {remove} from 'lodash'

import userLocation from '../../models/user-location.js'

import SpeedCounter from './speed-counter.js'
import BooleanSettings from './boolean-settings.js'
import Coordinates from './coordinates.js'
import SpeedLimit from './speed-limit.js'
import Controls from './controls.js'
import TotalDistance from './total-distance.js'
import Autopilot from './autopilot.js'

import HereApi from '../../config/here.js'
import autopilot from "../../models/autopilot";
import places from "places.js";

@observer
class Map extends Component {

  map = null
  marker = null
  @observable waypoints = []

  @observable mapOptions = {
    keyboardShortcuts: false,
    waypointMode: true
  }

  componentWillMount() {
    // get user geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this.handleGeolocationSuccess,
        this.handleGeolocationFail,
        { enableHighAccuracy: true, maximumAge: 0 }
      )
    }
  }

  componentDidMount()  {
    const [ latitude, longitude ] = userLocation
    const platform = new H.service.Platform({
      app_id: HereApi.appId,
      app_code: HereApi.appCode,
      useHTTPS: true
    });
    const defaultLayers = platform.createDefaultLayers({
      tileSize: 256,
      ppi: undefined
    });
    const mapContainer = document.getElementById('map')
    const map = new H.Map(mapContainer,
      defaultLayers.normal.map,{
        center: {lat:52.5160, lng:13.3779},
        zoom: 13
      });
    this.map = map

    const behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map))
    const ui = H.ui.UI.createDefault(map, defaultLayers)

    var icon = new H.map.Icon('pokeball.png', {size: {h:22,w:22}});
    this.marker = new H.map.Marker({lat:latitude, lng:longitude},{icon:icon})

    map.addObject(this.marker);

    const that = this;
    map.addEventListener('tap', function (evt) {
      const coord = map.screenToGeo(evt.currentPointer.viewportX, evt.currentPointer.viewportY)
      const lat = coord.lat.toFixed(6)
      const lng = coord.lng.toFixed(6)

      if (!that.mapOptions.waypointMode) {
        that.suggestionChange(lat, lng)
      } else {
        that.handleWaypoint(lat, lng, evt)
      }
    })

    // initialize algolia places input
    this.placesAutocomplete = places({ container: this.placesEl })
    this.placesAutocomplete.on('change', this.placesChange)

    window.addEventListener('keyup', ({ keyCode }) => {
      // use the space bar to pause/start autopilot
      if (keyCode === 32) {
        if (autopilot.running && !autopilot.paused) {
          this.autopilot.pause()
        } else if (autopilot.paused) {
          this.autopilot.start()
        }
      }
    })
  }

  // geolocation API might be down, use http://ipinfo.io
  // source: http://stackoverflow.com/a/32338735
  handleGeolocationFail = async (geolocationErr) => {
    Alert.warning(`
      <strong>Error getting your geolocation, using IP location</strong>
      <div class='stack'>${geolocationErr.message}</div>
    `, { timeout: 3000 })

    try {
      const { data: { loc } } = await axios({ url: 'http://ipinfo.io/' })
      const [ latitude, longitude ] = loc.split(',').map(coord => parseFloat(coord))
      this.handleGeolocationSuccess({ coords: { latitude, longitude } })
    } catch (xhrErr) {
      Alert.error(`
        <strong>Could not use IP location</strong>
        <div>Try to restart app, report issue to github</div>
        <div class='stack'>${xhrErr}</div>
      `)
    }
  }

  @action handleGeolocationSuccess({ coords: { latitude, longitude } }) {
    userLocation.replace([ latitude, longitude ])
    this.map.setCenter({lat:latitude, lng:longitude})
  }

  @action toggleWaypointMode = () => {
    this.mapOptions.waypointMode = !this.mapOptions.waypointMode
    map.draggable = this.mapOptions.waypointMode
  }

  @action startWaypointRouting = () => {
    if (this.waypoints.length > 0) {
      this.autopilot.handleSuggestionChange({suggestions: this.waypoints})
    }
  }

  @action placesChange = suggestion => {
    this.placesAutocomplete.setVal(null)
    this.map.setCenter({lat:suggestion.suggestion.latlng.lat, lng:suggestion.suggestion.latlng.lng})
    this.autopilot.handleSuggestionChange(suggestion)
  }

  @action suggestionChange = (lat, lng) => {
      this.placesAutocomplete.setVal(null)
      this.autopilot.handleSuggestionChange({suggestion: {latlng: {lat, lng}}})
  }

  @action handleWaypoint = (lat, lng, evt) => {
    if (evt && evt.target instanceof mapsjs.map.Marker) {
      const wp = remove(this.waypoints, (e) => e.id === evt.target.getId())
      if (wp.length > 0) {
        this.map.removeObject(evt.target)
      }
    } else {
      const svg = `<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
         viewBox="0 0 30 30" style="enable-background:new 0 0 30 30;" xml:space="preserve">
      <g id="XMLID_2_">
        <g>
          <path style="fill:#0F86BD;" d="M15,28.9c-1.6-3-8-9.4-9.9-13.5c-0.6-1.3-1-2.7-1-4.2C4.2,5.7,9.1,1.1,15,1.1s10.9,4.6,10.9,10.1c0,1.5-0.4,2.9-1,4.2l0,0C23,19.5,16.6,25.9,15,28.9L15,28.9z"/>
        </g>
        <g>
          <path style="fill:none;stroke:#87C2DE;stroke-width:2;stroke-linecap:round;stroke-miterlimit:10;" d="M5.1,15.4c-0.6-1.3-1-2.7-1-4.2C4.2,5.7,9.1,1.1,15,1.1s10.9,4.6,10.9,10.1c0,1.5-0.4,2.9-1,4.2"/>
            <line style="fill:none;stroke:#87C2DE;stroke-width:2;stroke-linecap:round;stroke-miterlimit:10;" x1="15.1" y1="28.9" x2="15.1" y2="28.9"/>
          <path style="fill:none;stroke:#87C2DE;stroke-width:2;stroke-linecap:round;stroke-miterlimit:10;" d="M5.1,15.4
            c1.9,4.1,8.3,10.5,9.9,13.5"/>
          <path style="fill:none;stroke:#87C2DE;stroke-width:2;stroke-linecap:round;stroke-miterlimit:10;" d="M24.9,15.4
            c-1.9,4.1-8.3,10.5-9.9,13.5h0v0"/>
        </g>
      </g>
      <text x="15" y="17" font-size="10pt" font-family="Arial" text-anchor="middle">${this.waypoints.length + 1}</text>
    </svg>`
      var icon = new H.map.Icon(svg, {size: {h:40,w:40}})
      const mapWaypoint = new H.map.Marker({lat:lat, lng:lng}, {icon: icon})
      const wp = {lat:lat, lng:lng, id: this.map.addObject(mapWaypoint).getId()};
      this.waypoints.push(wp)
    }
  }

  render() {
    const [ latitude, longitude ] = userLocation
    if (this.marker) {
      this.marker.setPosition({lat:latitude, lng:longitude})
    }

    return (
      <div className='google-map-container'>
        { /* only display google map when user geolocated */ }
          <div id="map" style={ {position:'absolute', width:'100%', height:'100%', background:'grey'}} >

            { /* userlocation center */ }
          </div>
        { !(latitude && longitude) ?
          <div
            style={ {
              position: 'absolute',
              top: 'calc(50vh - (100px / 2) - 60px)',
              left: 'calc(50vw - (260px / 2))'
            } }
            className='alert alert-info text-center'>
            <i
              style={ { marginBottom: 10 } }
              className='fa fa-spin fa-2x fa-refresh' />
            <div>Loading user location & map...</div>
          </div> : <div/> }

        <div className='btn btn-drag-map'>
          { this.mapOptions.waypointMode ?
            <div>
              <div
                style={{marginRight: '10px'}}
                className='btn btn-sm btn-primary'
                onClick={ this.toggleWaypointMode }>
                Waypoints activated
              </div>
              {this.waypoints.length > 0 ?
                <div
                  className='btn btn-sm btn-primary'
                  onClick={this.startWaypointRouting}>
                  <i className='fa fa-play'/>
                </div>
                :
                <div
                  className='btn btn-sm btn-secondary'>
                  <i className='fa fa-play'/>
                </div>
              }
            </div>
            :
            <div
              style={{marginLeft: '10px'}}
              className='btn btn-sm btn-secondary'
              onClick={ this.toggleWaypointMode }>
              Waypoints deactivated
            </div> }
        </div>

        { /* controls, settings displayed on top of the map */ }
        <div className='algolia-places places'>
          <input ref={ (ref) => { this.placesEl = ref } } type='search' placeholder='Destination' />
        </div>
        <Coordinates />
        <SpeedCounter />
        <SpeedLimit />
        <BooleanSettings />
        <Controls />
        <TotalDistance />
        <Autopilot ref={ (ref) => { this.autopilot = ref } } />
      </div>
    )
  }
}
export default Map
