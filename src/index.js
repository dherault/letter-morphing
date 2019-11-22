const maker = require('makerjs')
const Raphael = require('raphael')
const opentype = require('opentype.js')

const apiKey = 'AIzaSyDdsEpMDuWlIWNiStq9FLpAxy7Mvzya3nQ'

const svgMargin = 2
const pointMaxWidth = 100
const svgSize = 256
const svgWidth = 700

let fonts
let selectedFontData
let rootElement
let fontsSelectElement
let resetButtonElement
let inputInputElement
let outputInputElement
let morphButtonElement

function initializeApplication() {
  rootElement = document.getElementById('root')
  fontsSelectElement = document.getElementById('select-fonts')
  resetButtonElement = document.getElementById('button-reset')
  morphButtonElement = document.getElementById('button-morph')
  inputInputElement = document.getElementById('input-input')
  outputInputElement = document.getElementById('input-output')

  fontsSelectElement.onchange = () => {
    selectedFontData = fonts.find(font => font.family === fontsSelectElement.value)
  }

  resetButtonElement.onclick = handleResetClick
  morphButtonElement.onclick = handleMorphClick

  return handleResetClick()

  // fetchFont().then(data => {
  //   fonts = data.items;
  //   [selectedFontData] = fonts

  //   fonts.forEach(font => {
  //     const optionElement = document.createElement('option')

  //     optionElement.text = font.family
  //     fontsSelectElement.options.add(optionElement)
  //   })

  //   handleResetClick()
  // })
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

function handleResetClick() {
  opentype.load('/Roboto-Regular.ttf', (error, font) => {
  // opentype.load(selectedFontData.files.regular, (error, font) => {

    if (error) {
      return console.error(error)
    }

    const inputTextModel = new maker.models.Text(font, inputInputElement.value.substring(0, 1), svgSize, false)
    const outputTextModel = new maker.models.Text(font, outputInputElement.value.substring(0, 1), svgSize, false)

    const inputSvgText = maker.exporter.toSVG(inputTextModel, { useSvgPathOnly: true })
    const outputSvgText = maker.exporter.toSVG(outputTextModel, { useSvgPathOnly: true })

    const inputSvgData = getTextPoints(inputSvgText)
    const outputSvgData = getTextPoints(outputSvgText)

    morph(inputSvgData, outputSvgData)
  })
}

const numberOfPoints = 100

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
  // const halfX = diffX / 2
  // const halfXDistance = pointMaxWidth / 24
  // let firstPointMinY = Infinity
  // let firstPointIndex = -1

  points.forEach((point, index) => {
    point.x = ((point.x - minX) * pointMaxWidth) / diffX
    point.y = ((point.y - minY) * pointMaxHeight) / diffY

    // if (point.x > halfX - halfXDistance && point.x < halfX + halfXDistance && point.y < firstPointMinY) {
    //   firstPointIndex = index
    //   firstPointMinY = point.y
    // }
  })

  // for (let i = 0; i < firstPointIndex; i++) {
  //   points.push(points.shift())
  // }

  const threshold = 1.5 * stepSize
  const pointGroups = [[points.shift()]]

  points.forEach(point => {
    const group = pointGroups.find(group => distance(point, group[0]) < threshold || distance(point, group[group.length - 1]) < threshold)

    if (group) group.push(point)
    else pointGroups.push([point])
  })

  return {
    groups: pointGroups,
    width: pointMaxWidth,
    height: pointMaxHeight,
  }
}

function distance(p1, p2) {
  return Math.sqrt((p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y))
}

function createSvg({ groups, width, height }) {
  const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg')

  svgElement.setAttribute('viewBox', `${-svgMargin} ${-svgMargin} ${width + 2 * svgMargin} ${height + 2 * svgMargin}`)
  svgElement.setAttribute('width', svgWidth)

  groups.forEach(group => {
    let d = `M ${(group[0].x + group[group.length - 1].x) / 2} ${(group[0].y + group[group.length - 1].y) / 2}`

    const circles = []
    const texts = []

    group.forEach((point, index) => {
      const circleElement = document.createElementNS('http://www.w3.org/2000/svg', 'circle')

      circleElement.setAttribute('cx', point.x)
      circleElement.setAttribute('cy', point.y)
      circleElement.setAttribute('r', 1)
      circleElement.setAttribute('fill', index % 2 === 0 ? 'red' : 'blue')

      circles.push(circleElement)

      const nextPoint = index === group.length - 1 ? group[0] : group[index + 1]

      const halfNextPoint = {
        x: (nextPoint.x + point.x) / 2,
        y: (nextPoint.y + point.y) / 2,
      }

      d += ` Q ${point.x} ${point.y}, ${halfNextPoint.x} ${halfNextPoint.y}`

      const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text')

      textElement.innerHTML = index
      textElement.setAttribute('font-size', 6)
      textElement.setAttribute('x', point.x)
      textElement.setAttribute('y', point.y)

      texts.push(textElement)
    })

    const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path')

    pathElement.setAttribute('d', d)
    pathElement.setAttribute('stroke', 'black')
    pathElement.setAttribute('stroke-width', 1)
    pathElement.setAttribute('fill', 'transparent')

    svgElement.appendChild(pathElement)

    circles.forEach(element => svgElement.appendChild(element))
    texts.forEach(element => svgElement.appendChild(element))
  })

  return svgElement
}

const morphingSteps = 100

let launchMorphing

function morph(inputData, outputData) {
  drawSvg(inputData)
  drawSvg(outputData, false)

  const widthDiff = outputData.width - inputData.width
  const heightDiff = outputData.height - inputData.height

  const data = {
    width: inputData.width,
    height: inputData.height,
    widthStep: widthDiff / morphingSteps,
    heightStep: heightDiff / morphingSteps,
    groups: inputData.groups.slice(),
  }

  data.groups.forEach((group, groupIndex) => {
    const adversarialGroup = outputData.groups[groupIndex]
    const l = Math.max(group.length, adversarialGroup.length)
    const groupToFill = group.length === l ? adversarialGroup : group

    for (let i = groupToFill.length; i < l; i++) {
      const k = Math.floor(Math.random() * (groupToFill.length - 1))
      const p = {
        x: (groupToFill[k].x + groupToFill[k + 1].x) / 2,
        y: (groupToFill[k].y + groupToFill[k + 1].y) / 2,
      }

      groupToFill.splice(k, 0, p)
    }
  })

  normalizeGroupsOrder(data)
  normalizeGroupsOrder(outputData)

  data.groups.forEach((group, i) => {
    group.forEach((point, j) => {
      const outputPoint = outputData.groups[i][j]

      point.dx = (outputPoint.x - point.x) / morphingSteps
      point.dy = (outputPoint.y - point.y) / morphingSteps
    })
  })

  console.log('data', data, outputData)

  launchMorphing = () => morphTimeout(data)
}

function normalizeGroupsOrder(data) {
  data.groups.forEach(group => {
    const pointIndexes = []
    const marginY = data.height / 100
    let minY = Infinity

    group.forEach(point => {
      if (point.y < minY) {
        minY = point.y
      }
    })

    group.forEach((point, index) => {
      if (point.y < minY + marginY) {
        pointIndexes.push(index)
      }
    })

    const sorted = pointIndexes
      .map(index => ({ data: group[index], index }))
      .sort((a, b) => a.data.x < b.data.x ? -1 : 1)

    const { index } = sorted[Math.floor(sorted.length / 2)]

    for (let i = 0; i < index; i++) {
      group.push(group.shift())
    }
  })
}

function handleMorphClick() {
  launchMorphing()
}

function morphTimeout(data, iteration = 0) {
  if (iteration === morphingSteps) return

  setTimeout(() => {
    data.width += data.widthStep
    data.height += data.heightStep

    data.groups.forEach(group => {
      group.forEach(point => {
        point.x += point.dx
        point.y += point.dy
      })
    })

    drawSvg(data)

    morphTimeout(data, iteration + 1)
  }, 20)
}

function drawSvg(data, reset = true) {
  const svg = createSvg(data)

  if (reset) {
    rootElement.innerHTML = ''
  }

  rootElement.appendChild(svg)
}

window.onload = initializeApplication
