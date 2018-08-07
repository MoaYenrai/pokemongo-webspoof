import {defer, random} from 'lodash'
import React from 'react'
import {action, observable} from 'mobx'
import {observer} from 'mobx-react'
import cx from 'classnames'

import userLocation from '../../models/user-location.js'
import settings from '../../models/settings.js'

const lastMoveDirection = observable(null)

const handleMove = action((direction) => {
  const speedCoeff = settings.speedLimit.get()
  const jitter = random(0.000003, -0.000003, true)
  const moveNS  = random(0.0000200, 0.000070, true) / speedCoeff
  const moveWE = random(0.0000600, 0.000070, true) / speedCoeff



  let newLocation
  switch (direction) {
  case 'W': { newLocation = [ userLocation[0] + jitter, userLocation[1] - moveWE ]; break }
  case 'E': { newLocation = [ userLocation[0] + jitter, userLocation[1] + moveWE ]; break }
  case 'S': { newLocation = [ userLocation[0] - moveNS, userLocation[1] + jitter ]; break }
  case 'N': { newLocation = [ userLocation[0] + moveNS, userLocation[1] + jitter ]; break }
  case 'NE': { newLocation = [ userLocation[0] + (moveNS / 2), userLocation[1] + (moveWE / 2)  ]; break }
  case 'ES': { newLocation = [ userLocation[0] - (moveNS / 2) , userLocation[1]  + (moveWE / 2)  ]; break }
  case 'SW': { newLocation = [ userLocation[0] - (moveNS / 2) , userLocation[1] - (moveWE / 2) ]; break }
  case 'WN': { newLocation = [ userLocation[0] + (moveNS / 2) , userLocation[1] - (moveWE / 2)  ]; break }
  default: { newLocation = [ userLocation[0] + jitter, userLocation[1] + jitter ] }
  }

  userLocation.replace(newLocation)

  // we set `lastMoveDirection` to `null` for react re-render without class `.last`
  lastMoveDirection.set(null)
  defer(action(() => lastMoveDirection.set(direction)))
})

window.addEventListener('keydown', ({ keyCode }) => {
  switch (keyCode) {
  case 65:
  case 37: { return handleMove('W') }
  case 87:
  case 90:
  case 38: { return handleMove('N') }
  case 68:
  case 39: { return handleMove('E') }
  case 83:
  case 40: { return handleMove('S') }
  case 81: { return handleMove('WN') }
  case 69: { return handleMove('NE') }
  case 67: { return handleMove('ES') }
  case 89: { return handleMove('SW') }
  default: return undefined
  }
})

const Controls = observer(() =>
  <div className='controls'>
    { [ 'N', 'E', 'S', 'W', 'NE', 'ES', 'SW', 'WN' ].map(direction =>
      <span
        key={ direction }
        onClick={ () => handleMove(direction) }
        className={ cx(
          `octicon octicon-arrow-up control-arrow-${direction.toLowerCase()}`,
          { last: lastMoveDirection.get() === direction }
        ) } />
    ) }
  </div>
)

export default Controls
