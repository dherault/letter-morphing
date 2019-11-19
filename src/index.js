const maker = require('makerjs')
const Raphael = require('raphael')
const opentype = require('opentype.js')

const apiKey = 'AIzaSyDdsEpMDuWlIWNiStq9FLpAxy7Mvzya3nQ'

const svgMargin = 2
const pointMaxWidth = 100
const svgSize = 256
const svgWidth = 256

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

    handleSubmitClick()
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

    const inputTextModel = new maker.models.Text(font, inputInputElement.value.substring(0, 1), svgSize)
    const outputTextModel = new maker.models.Text(font, outputInputElement.value.substring(0, 1), svgSize)

    const inputSvgText = maker.exporter.toSVG(inputTextModel)
    const outputSvgText = maker.exporter.toSVG(outputTextModel)

    // rootElement.innerHTML = inputSvgText + outputSvgText

    const inputSvgData = getTextPoints(inputSvgText)
    const outputSvgData = getTextPoints(outputSvgText)

    morph(inputSvgData, outputSvgData)
  })
}

const numberOfPoints = 256

function getTextPoints(svgText) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgText, 'application/xml')
  const pathD = doc.getElementsByTagName('path')[0].getAttribute('d').replace(' ', ',')
  const length = Raphael.getTotalLength(pathD)
  const stepSize = length / numberOfPoints
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
  const halfX = diffX / 2
  const halfXDistance = pointMaxWidth / 24
  let firstPointMinY = Infinity
  let firstPointIndex = -1

  points.forEach((point, index) => {
    point.x = ((point.x - minX) * pointMaxWidth) / diffX
    point.y = ((point.y - minY) * pointMaxHeight) / diffY

    if (point.x > halfX - halfXDistance && point.x < halfX + halfXDistance && point.y < firstPointMinY) {
      firstPointIndex = index
      firstPointMinY = point.y
    }
  })

  for (let i = 0; i < firstPointIndex; i++) {
    points.push(points.shift())
  }

  return {
    points,
    width: pointMaxWidth,
    height: pointMaxHeight,
  }
}

function createSvg({ points, width, height }) {
  const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg')

  svgElement.setAttribute('viewBox', `${-svgMargin} ${-svgMargin} ${width + 2 * svgMargin} ${height + 2 * svgMargin}`)
  svgElement.setAttribute('width', svgWidth)

  // points.forEach((point, i) => {
  //   const circleElement = document.createElementNS('http://www.w3.org/2000/svg', 'circle')

  //   circleElement.setAttribute('cx', point.x)
  //   circleElement.setAttribute('cy', point.y)
  //   circleElement.setAttribute('r', 1)

  //   if (i === 0) {
  //     circleElement.setAttribute('fill', 'red')
  //   }

  //   svgElement.appendChild(circleElement)
  // })

  let d = `M ${(points[0].x + points[points.length - 1].x) / 2} ${(points[0].y + points[points.length - 1].y) / 2}`

  points.forEach((point, index) => {
    const nextPoint = index === points.length - 1 ? points[0] : points[index + 1]

    const halfNextPoint = {
      x: (nextPoint.x + point.x) / 2,
      y: (nextPoint.y + point.y) / 2,
    }

    d += ` Q ${point.x} ${point.y}, ${halfNextPoint.x} ${halfNextPoint.y}`
  })

  const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path')

  pathElement.setAttribute('d', d)
  pathElement.setAttribute('stroke', 'black')
  pathElement.setAttribute('stroke-width', 1)
  pathElement.setAttribute('fill', 'transparent')

  svgElement.appendChild(pathElement)

  return svgElement
}

const morphingSteps = 100

function morph(inputData, outputData) {
  drawSvg(inputData)

  const widthDiff = outputData.width - inputData.width
  const heightDiff = outputData.height - inputData.height

  const data = {
    width: inputData.width,
    height: inputData.height,
    widthStep: widthDiff / morphingSteps,
    heightStep: heightDiff / morphingSteps,
    points: inputData.points.slice(),
  }

  data.points.forEach((point, index) => {
    const outputPoint = outputData.points[index]

    point.dx = (outputPoint.x - point.x) / morphingSteps
    point.dy = (outputPoint.y - point.y) / morphingSteps
  })

  morphTimeout(data)
}

function morphTimeout(data, iteration = 0) {
  if (iteration === morphingSteps) return

  setTimeout(() => {
    data.width += data.widthStep
    data.height += data.heightStep

    data.points.forEach(point => {
      point.x += point.dx
      point.y += point.dy
    })

    drawSvg(data)

    morphTimeout(data, iteration + 1)
  }, 10)
}

function drawSvg(data) {
  const svg = createSvg(data)

  rootElement.innerHTML = ''

  rootElement.appendChild(svg)
}

window.onload = initializeApplication
