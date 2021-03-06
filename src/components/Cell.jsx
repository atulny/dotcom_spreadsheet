// eslint-disable-next-line
import React from 'react'
import PropTypes from 'prop-types'

export default class Cell extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      editing: false,
      value: props.value,
    }
    this.display = this.computeDisplay({ x: props.x, y: props.y }, props.value)
    this.timer = 0
    this.delay = 200
    this.prevent = false
  }

  /**
   * `unselectAll`  event  broadcast 
   */
  componentDidMount() {
    window.document.addEventListener('unselectAll', this.handleUnselectAll)
  }

  /**
   * only update if modified
   */
  shouldComponentUpdate(nextProps, nextState) {
    if (this.state.value !== '' && this.state.value.slice(0, 1) === '=') {
      return true
    }

    // Update if own state values or value prop changed? 
    if (nextState.value !== this.state.value ||
        nextState.editing !== this.state.editing ||
        nextState.selected !== this.state.selected ||
        nextProps.value !== this.props.value) {
      return true
    }

    return false
  }

  /**
   * Before updating, execute the formula on the Cell value to calculate the
   * `display` value. Especially useful when a redraw is pushed upon this cell
   * when editing another cell that this might depend upon
   */
  componentWillUpdate() {
    this.display = this.computeDisplay({ x: this.props.x, y: this.props.y }, this.state.value)
  }

  /**
   * Remove the `unselectAll` event listener added in `componentDidMount()`
   */
  componentWillUnmount() {
    window.document.removeEventListener('unselectAll', this.handleUnselectAll)
  }

  /**
   * When a Cell value changes, re-determine the display value
   * by calling the formula calculation
   */
  onChange = (e) => {
    this.setState({ value: e.target.value })
    this.display = this.computeDisplay({ x: this.props.x, y: this.props.y }, e.target.value)
    this.props.updateCells()
  }

  /**
   * Handle pressing a key when the Cell is an input element
   */
  onKeyOnInput = (e) => {
    if (e.key === 'Enter') {
      this.hasNewValue(e.target.value)
    }
  }

  /**
   * Handle pressing a key when the Cell is a span element,
   * not yet in editing mode
   */
  onKeyOnSpan = () => {
    if (!this.state.editing) {
      this.setState({ editing: true })
    }
  }

  /**
   * Handle moving away from a cell, stores the new value
   */
  onBlur = (e) => {
    this.hasNewValue(e.target.value)
  }

  /**
   * Used by `componentDid(Un)Mount`, handles the `unselectAll` event response
   */
  handleUnselectAll = () => {
    if (this.state.selected || this.state.editing) {
      this.setState({ selected: false, editing: false })
    }
  }

  /**
   * Called by the `onBlur` or `onKeyOnInput` event handlers,
   * it escalates the value changed event, and restore the editing state
   * to `false`.
   */
  hasNewValue = (value) => {
    this.props.onChangedValue(
      {
        x: this.props.x,
        y: this.props.y,
      },
      value,
    )
    this.setState({ editing: false })
  }

  /**
   * Emits the `unselectAll` event, used to tell all the other cells to
   * unselect
   */
  emitUnselectAllEvent = () => {
    const unselectAllEvent = new Event('unselectAll')
    window.document.dispatchEvent(unselectAllEvent)
  }

  /**
   * Handle clicking a Cell.
   */
  clicked = () => {
    // Prevent click and double click to conflict
    this.timer = setTimeout(() => {
      if (!this.prevent) {
        // Unselect all the other cells and set the current
        // Cell state to `selected`
        this.emitUnselectAllEvent()
        this.setState({ selected: true })
      }
      this.prevent = false
    }, this.delay)
  }
  doubleClickedOnfirstRow = () => {
    //alert(`add column at ${this.props.x}`)
    this.props.addColumn()
  }
  doubleClickedOnfirstColumn = () => {
    //alert(`add row at ${this.props.y}`)
    this.props.addRow()

  }
  /**
   * Handle doubleclicking a Cell.
   */
  doubleClicked = () => {
    // Prevent click and double click to conflict
    clearTimeout(this.timer)
    this.prevent = true

    // Unselect all the other cells and set the current
    // Cell state to `selected` & `editing`
    this.emitUnselectAllEvent()
    this.setState({ editing: true, selected: true })
  }

  /**
   * Executes the formula calculation on the cell value
   */
  computeDisplay = ({ x, y }, value) => {
    if (value.slice(0, 1) === '=') {
      const res = this.props.execFormula({ x, y }, value.slice(1))
      if (res.error !== null) {
        return 'INVALID'
      }
      return res.result
    }
    return value
  }

  /**
   * Calculates a cell's CSS values
   */
  computeCss = () => {
    const css = {
      backgroundColor: "#fff",
      
      padding: '4px',
      margin: '0',
      height: '24px',
      boxSizing: 'border-box',
      position: 'relative',
      display: 'inline-block',
      color: 'black',
      border: '1px solid #cacaca',
      textAlign: 'left',
      verticalAlign: 'top',
      fontSize: '14px',
      lineHeight: '15px',
      overflow: 'hidden',
      fontFamily: 'Verdana, sans-serif',
    }

    if (this.props.x === 0 || this.props.y === 0) {
      css.textAlign = 'center'
      css.backgroundColor = '#f0f0f0'
      css.fontWeight = 'bold'
    }

    return css
  }

  render() {
    const css = this.computeCss()

    // column 0
    if (this.props.x === 0) {
      return (
        <span onDoubleClick={this.doubleClickedOnfirstColumn} style={css}>
          {this.props.y}
        </span>
      )
    }

    // row 0
    if (this.props.y === 0) {
      const alpha = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
      return (
        <span onKeyPress={this.onKeyOnSpan} onDoubleClick={this.doubleClickedOnfirstRow} style={css} role="presentation">
          {alpha[this.props.x]}
        </span>
      )
    }

    if (this.state.selected) {
      css.outlineColor = 'blue'
      css.outlineStyle = 'solid'
      css.zIndex=1
    }

    if (this.state.editing) {
      return (
        <input
          style={css}
          type="text"
          onBlur={this.onBlur}
          onKeyPress={this.onKeyOnInput}
          value={this.state.value}
          onChange={this.onChange}
          autoFocus
        />
      )
    }
    return (
      <span
        onClick={e => this.clicked(e)}
        onDoubleClick={e => this.doubleClicked(e)}
        style={css}
        role="presentation"
      >
        {this.display}
      </span>
    )
  }
}

Cell.propTypes = {
  /**
   * Function called when the cell changes its value
   */
  onChangedValue: PropTypes.func.isRequired,

  /**
   * Function called when formula recalculation is needed
   */
  execFormula: PropTypes.func.isRequired,

  /**
   * Function called when a cell is refreshed and requires
   * an update of the others
   */
  updateCells: PropTypes.func.isRequired,

  /**
   * The x coordinates of this cell
   */
  x: PropTypes.number.isRequired,

  /**
   * The y coordinates of this cell
   */
  y: PropTypes.number.isRequired,

  /**
   * The value of this cell
   */
  value: PropTypes.string.isRequired,
}
