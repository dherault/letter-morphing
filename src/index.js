const maker = require('makerjs')
const opentype = require('opentype.js')
const apiKey = 'AIzaSyDdsEpMDuWlIWNiStq9FLpAxy7Mvzya3nQ'

function draw() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')

  svg.setAttribute('width', 256)
  svg.setAttribute('height', 256)
  svg.setAttribute('viewbox', '0 0 100 100')

  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')

  rect.setAttribute('x', 0)
  rect.setAttribute('y', 0)
  rect.setAttribute('width', '100%')
  rect.setAttribute('height', '100%')
  rect.setAttribute('fill', 'lightblue')

  svg.appendChild(rect)

  rootElement.appendChild(svg)
}

let fonts
let rootElement
let fontsSelectElement

function initializeApplication() {
  rootElement = document.getElementById('root')
  fontsSelectElement = document.getElementById('select-fonts')

  fetchFont().then(fonts => {
    fonts.items.forEach(font => {
      const optionElement = document.createElement('option')

      optionElement.text = font.family
      fontsSelectElement.options.add(optionElement)
    })
  })

  fontsSelectElement.onchange = event => {
    console.log(event)
  }
}

function fetchFont() {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('get', `https://www.googleapis.com/webfonts/v1/webfonts?key=${apiKey}`, true)
    xhr.onloadend = () => resolve(JSON.parse(xhr.responseText))
    xhr.onerror = reject
    xhr.send()
  })
}

window.onload = initializeApplication
