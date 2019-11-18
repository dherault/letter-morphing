const maker = require('makerjs')
const Raphael = require('raphael')
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

const stepSize = 6

let fonts
let selectedFontData
let rootElement
let fontsSelectElement
let submitButtonElement
let inputInputElement
let outputInputElement

function initializeApplication() {
  rootElement = document.getElementById('root')
  fontsSelectElement = document.getElementById('select-fonts')
  submitButtonElement = document.getElementById('button-submit')
  inputInputElement = document.getElementById('input-input')
  outputInputElement = document.getElementById('input-output')

  fontsSelectElement.onchange = () => {
    selectedFontData = fonts.find(font => font.family === fontsSelectElement.value)
  }

  submitButtonElement.onclick = handleSubmitClick

  fetchFont().then(data => {
    fonts = data.items;
    [selectedFontData] = fonts

    fonts.forEach(font => {
      const optionElement = document.createElement('option')

      optionElement.text = font.family
      fontsSelectElement.options.add(optionElement)
    })
  })

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

function handleSubmitClick() {
  opentype.load(selectedFontData.files.regular, (error, font) => {

    if (error) {
      return console.error(error)
    }

    const inputTextModel = new maker.models.Text(font, inputInputElement.value.substring(0, 1), 256)
    const outputTextModel = new maker.models.Text(font, outputInputElement.value.substring(0, 1), 256)

    const inputSvgText = maker.exporter.toSVG(inputTextModel)
    const outputSvgText = maker.exporter.toSVG(outputTextModel)

    rootElement.innerHTML = inputSvgText + outputSvgText

    const inputSvgElement = createSvgFromPoints(getTextPoints(inputSvgText))
    const outputSvgElement = createSvgFromPoints(getTextPoints(outputSvgText))

    rootElement.appendChild(inputSvgElement)
    rootElement.appendChild(outputSvgElement)
  })
}

const pointMaxWidth = 100

function getTextPoints(svgText) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgText, 'application/xml')
  const pathD = doc.getElementsByTagName('path')[0].getAttribute('d').replace(' ', ',')
  const length = Raphael.getTotalLength(pathD)
  const points = []

  let minX = Infinity
  let minY = Infinity
  let maxX = 0
  let maxY = 0

  for (let i = 0; i < length; i += stepSize) {
    const point = Raphael.getPointAtLength(pathD, i)

    points.push(point)

    if (point.x < minX) minX = point.x
    if (point.y < minY) minY = point.y
    if (point.x > maxX) maxX = point.x
    if (point.y > maxY) maxY = point.y
  }

  const diffX = maxX - minX
  const diffY = maxY - minY
  const pointMaxHeight = pointMaxWidth * (diffY / diffX)

  points.forEach(point => {
    point.x = ((point.x - minX) * pointMaxWidth) / diffX
    point.y = ((point.y - minY) * pointMaxHeight) / diffY
  })

  return {
    points,
    width: pointMaxWidth,
    height: pointMaxHeight,
  }
}

const svgMargin = 2

function createSvgFromPoints({ points, width, height }) {
  const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg')

  svgElement.setAttribute('viewBox', `${-svgMargin} ${-svgMargin} ${width + 2 * svgMargin} ${height + 2 * svgMargin}`)
  svgElement.setAttribute('width', width)
  svgElement.setAttribute('height', height)

  points.forEach(point => {
    const circleElement = document.createElementNS('http://www.w3.org/2000/svg', 'circle')

    circleElement.setAttribute('cx', point.x)
    circleElement.setAttribute('cy', point.y)
    circleElement.setAttribute('r', 1)

    svgElement.appendChild(circleElement)
  })

  return svgElement
}

window.onload = initializeApplication
