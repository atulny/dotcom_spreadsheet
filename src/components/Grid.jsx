import React from 'react'
import PropTypes from 'prop-types'
import { Parser as FormulaParser } from 'hot-formula-parser'
import Row from './Row'

/**
 * Grid creates a table with x rows and y columns
 */
export default class Grid extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      data: {},
    }

    this.tableIdentifier = `gridData-${props.id}`

    // Initialize the formula parser on demand
    this.parser = new FormulaParser()

    // When a formula contains a cell value, this event lets us
    // hook and return an error value if necessary
    this.parser.on('callCellValue', (cellCoord, done) => {
      const x = cellCoord.column.index + 1
      const y = cellCoord.row.index + 1

      // Check if I have that coordinates tuple in the table range
      if (x > this.props.xy[0] || y > this.props.xy[1]) {
        throw this.parser.Error(this.parser.ERROR_NOT_AVAILABLE)
      }

      // Check that the cell is not self referencing
      if (this.parser.cell.x === x && this.parser.cell.y === y) {
        throw this.parser.Error(this.parser.ERROR_REF)
      }

      if (!this.state.data[y] || !this.state.data[y][x]) {
        return done('')
      }

      // All fine
      return done(this.state.data[y][x])
    })

    // When a formula contains a range value, this event lets us
    // hook and return an error value if necessary
    this.parser.on('callRangeValue', (startCellCoord, endCellCoord, done) => {
      const sx = startCellCoord.column.index + 1
      const sy = startCellCoord.row.index + 1
      const ex = endCellCoord.column.index + 1
      const ey = endCellCoord.row.index + 1
      const fragment = []

      for (let y = sy; y <= ey; y += 1) {
        const row = this.state.data[y]
        if (!row) {
          continue
        }

        const colFragment = []

        for (let x = sx; x <= ex; x += 1) {
          let value = row[x]
          if (!value) {
            value = ''
          }

          if (value.slice(0, 1) === '=') {
            const res = this.execFormula({ x, y }, value.slice(1))
            if (res.error) {
              throw this.parser.Error(res.error)
            }
            value = res.result
          }

          colFragment.push(value)
        }
        fragment.push(colFragment)
      }

      if (fragment) {
        done(fragment)
      }
    })
  }

  /**
   * Initialize the sate from the localstorage, if found
   */
  componentWillMount() {
    if (this.props.saveToLocalStorage && window && window.localStorage) {
      const data = window.localStorage.getItem(this.tableIdentifier)
      if (data) {
        this.setState({ data: JSON.parse(data) })
      }
    }
  }

  /**
   * Force an update of the component
   */
  updateCells = () => {
    this.forceUpdate()
  }

  /**
   * Executes the formula on the `value` usign the FormulaParser object
   */
  execFormula = (cell, value) => {
    this.parser.cell = cell
    let res = this.parser.parse(value)
    if (res.error != null) {
      return res // tip: returning `res.error` shows more details
    }
    if (res.result.toString() === '') {
      return res
    }
    if (res.result.toString().slice(0, 1) === '=') {
      // formula points to formula
      res = this.execFormula(cell, res.result.slice(1))
    }

    return res
  }

  /**
   * Handles changing a cell, stores the new data state and stores into
   * local storage
   */
  handleChangedCell = ({ x, y }, value) => {
    const modifiedData = Object.assign({}, this.state.data)
    if (!modifiedData[y]) modifiedData[y] = {}
    modifiedData[y][x] = value
    this.setState({ data: modifiedData })

    if (this.props.saveToLocalStorage && window && window.localStorage) {
      window.localStorage.setItem(this.tableIdentifier, JSON.stringify(modifiedData))
    }
  }
  addRow= ( ) => {
    this.props.xy[1]=this.props.xy[1] + 1
    this.forceUpdate();

  }
  addColumn = ( ) => {
    this.props.xy[0]=this.props.xy[0] + 1
    this.forceUpdate();

  }
  render() {
    const rows = []

    for (let y = 0; y < this.props.xy[1] + 1; y += 1) {
      const rowData = this.state.data[y] || {}
      rows.push(
        <Row
          handleChangedCell={this.handleChangedCell}
          execFormula={this.execFormula}
          updateCells={this.updateCells}
          key={y}
          y={y}
          x={this.props.xy[0] + 1}
          rowData={rowData}
          addRow={this.addRow }
          addColumn={this.addColumn }

        />,
      )
    }
    const css={
      display: 'grid' ,
      gridTemplateColumns: `repeat(${this.props.xy[0]+1}, 80px)`,
      backgroundColor: '#fff',
      color : '#444' ,
      width :  'max-content'
    }
    return (
      <div style={css}> 
        {rows}
      </div>
    )
     
  }
}

Grid.propTypes = {
  /**
   * The number of rows and columns of the table
   * Using an array to be able to update the x and y values
   */
  xy: PropTypes.arrayOf(PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
  })).isRequired,
  /**
   * The number of rows of the table
   */
  id: PropTypes.string,

  /**
   * If enabled, saves the table state to the localStorage
   * Otherwise the table is refreshed on every save
   */
  saveToLocalStorage: PropTypes.bool,
}

Grid.defaultProps = {
  saveToLocalStorage: true,
  id: 'default',
}
