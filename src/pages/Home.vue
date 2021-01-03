<template>
  <div class="wrap">
    {{ turn }}
    <div class="board">
      <div class="board--inner">
        <div class="board--inner__row" v-for="row in 10">
          <div class="board--inner__col" :class="{
            'board--inner__col--goto': isBoxGoto(col - 1, row - 1),
            'board--inner__col--hover': isBoxHover(col - 1, row - 1),
            'board--inner__col--select': isBoxSelect(col - 1, row - 1)
          }" v-for="col in 10" @click="boxSelectMe(col - 1, row - 1)" />
        </div>
      </div>
      <transition name="fade" v-for="(item, index) in chips" :key="index">
        <div class="chip" :class="[
        `chip--offset_${item.x}_${item.y}`, {
            'chip--black': item.value == CHIP_BLACK,
            'chip--white': item.value == CHIP_WHITE,
            'is-king': item.isKing
          }
        ]" :key="index" :data-uuid="item.id" @click="boxSelectMe(item.x, item.y)" v-if="item.value" />
      </transition>
    </div>
  </div>
</template>
<script>
  const CHIP_WHITE = "W".charCodeAt(0),
    CHIP_BLACK = "B".charCodeAt(0),
    OFFSETS_CHIP_MOVE = [
      {
        offsetX: 1,
        offsetY: -1,
        isKing: true
      },
      {
        offsetX: 1,
        offsetY: 1,
        isKing: false
      },
      {
        offsetX: -1,
        offsetY: 1,
        isKing: false
      },
      {
        offsetX: -1,
        offsetY: -1,
        isKing: true
      }
    ],
    MAX_POINT = 10 * 20,
    MIN_POINT = -MAX_POINT,
    METHODS_OF_THE_PARTY_DEFAULT = {
      methods: [],
      eated: false
    }

  class Chip {
    static _id = 0
    id = null
    value = null
    isKing = false
    constructor(...props) {
      [this.value] = props
      this.id = ++Chip._id
    }
  }

  function MAP_DEFAULT() {
    const map = []

    for (let y = 0; y < 10; y++) {
      const row = []
      map.push(row)
      for (let x = 0; x < 10; x++) {
        let value = null
        if (y < 4) {
          value = y % 2 == 0 ? x % 2 ? CHIP_BLACK : null : x % 2 ? null : CHIP_BLACK
        } else if (y > 5) {
          value = y % 2 == 0 ? x % 2 ? CHIP_WHITE : null : x % 2 ? null : CHIP_WHITE
        }

        row.push(new Chip(value))
      }
    }

    return map
  }

  function isOutside(x, y) {
    return x < 0 || y < 0 || x > 9 || y > 9
  }

  function removeMethodsNotEat(methods) {
    return methods.filter(item => item.remove)
  }

  function tubeIsAllowedToGo(map, x, y, offX, offY) {
    const [newX, newY] = [x + offX, y + offY]

    if (isOutside(x, y) || isOutside(newX, newY) || map[y][x].value == null) {
      return null
    } else {
      if (map[newY][newX].value == null) {
        return {
          root: {
            x,
            y
          },
          newX,
          newY
        }
      } else {
        if (map[newY][newX].value != map[y][x].value && !isOutside(newX + offX, newY + offY) && map[newY + offY][newX + offX].value == null) {
          return {
            root: {
              x,
              y
            },
            remove: {
              x: newX,
              y: newY
            },
            newX: newX + offX,
            newY: newY + offY
          }
        }
      }
    }

    return null
  }

  function getMethodsOfTravel(map, x, y) {
    let methods = []
    let eated = false

    for (const { offsetX, offsetY, isKing } of OFFSETS_CHIP_MOVE) {
      const thisMethod = tubeIsAllowedToGo(map, x, y, offsetX, offsetY)

      if (thisMethod) {
        if (eated ? thisMethod.remove : (thisMethod.remove || ((map[y][x].value == CHIP_BLACK ? isKing : !isKing) ? map[y][x].isKing : true))) {
          if (!eated && thisMethod.remove) {
            methods = removeMethodsNotEat(methods)
            eated = true
          }
          methods.push(thisMethod)
        }
      }
    }

    return {
      methods,
      eated
    }
  }

  function getMethodsOfTheParty(map, valueCompare) {
    let count = 0
    let methods = []
    let eated = false

    map.some((row, y) => {
      return row.some(({ value }, x) => {
        if (value == valueCompare) {
          count++
          const thisMethods = getMethodsOfTravel(map, x, y)

          if (thisMethods.methods.length && (eated ? thisMethods.eated : true)) {
            if (!eated && thisMethods.eated) {
              methods = removeMethodsNotEat(methods)
              eated = true
            }
            methods.push(...thisMethods.methods)
          }

          if (count >= 20) {
            return true
          }
        }
      })
    })

    return {
      methods,
      eated
    }
  }

  function getStateMap(map) {
    let B = false,
      W = false
    map.some(row => row.some(({ value }) => {
      if (value == CHIP_BLACK) {
        B = true
      }
      if (value == CHIP_WHITE) {
        W = true
      }

      return B && W
    }))

    if (B == false) {
      return CHIP_WHITE
    }
    if (W == false) {
      return CHIP_BLACK
    }
  }

  function MiniMax(map, value, deep = 0, alpha = -Infinity, beta = Infinity, methods = null) {
    const reverseValue = value == CHIP_BLACK ? CHIP_WHITE : CHIP_BLACK
    switch (getStateMap(map)) {
      case CHIP_BLACK:
        return value == CHIP_BLACK ? MAX_POINT - deep : (MIN_POINT + deep)
      case CHIP_WHITE:
        return value == CHIP_WHITE ? MAX_POINT - deep : (MIN_POINT + deep)
    }

    if (deep > 5) {
      return deep
    }

    methods = methods || getMethodsOfTheParty(map, value).methods

    let bestValue = -Infinity
    for (let index = 0, length = methods.length; index < length; index++) {
      const {
        root: { x, y },
        remove,
        newX,
        newY
      } = methods[index]
      const newMap = cloneObject(map);
      [newMap[y][x], newMap[newY][newX]] = [newMap[newY][newX], newMap[y][x]]

      if (remove) {
        newMap[remove.y][remove.x].value = null
        newMap[remove.y][remove.x].isKing = false
        const methodsOfBox = getMethodsOfTravel(newMap, newX, newY)
        bestValue = Math.max(bestValue, 10 + MiniMax(newMap, methodsOfBox.eated ? value : reverseValue, deep + 1, alpha, beta, methodsOfBox.eated ? methodsOfBox.methods : null))
      } else {
        bestValue = Math.max(bestValue, MiniMax(newMap, reverseValue, deep + 1, -beta, -alpha))
      }

      alpha = Math.max(alpha, bestValue)
      if (alpha >= beta) {
        break
      }
    }
    return bestValue
  }

  function getBestMethod(map, valueCompare, reverse) {
    let count = 0
    let bestMethod = null
    let bestPoint = -Infinity

    if (reverse) {
      //.map = cloneObject(map).map(item => item.reverse())
    }

    getMethodsOfTheParty(map, valueCompare).methods.forEach(item => {
      const {
        root: { x, y },
        remove,
        newX,
        newY
      } = item
      const newMap = cloneObject(map);
      [newMap[y][x], newMap[newY][newX]] = [newMap[newY][newX], newMap[y][x]]

      if (remove) {
        newMap[remove.y][remove.x].value = null
        newMap[remove.y][remove.x].isKing = false
      }

      const point = MiniMax(newMap, valueCompare == CHIP_BLACK ? CHIP_WHITE : CHIP_BLACK) + (remove ? 10 : 0)

      if (point > bestPoint) {
        bestPoint = point
        bestMethod = item
      }
    })

    if (!bestMethod) {
      return random(getMethodsOfTheParty(map, valueCompare).methods)
    }

    return bestMethod
  }

  //lỗi mỗi hiệu ứng dm nó

  function isObject(val) {
    return val != null && typeof val == "object"
  }

  function cloneObject(object) {
    const newValue = Array.isArray(object) ? [] : {}
    if (Array.isArray(object)) {
      for (let index = 0, length = object.length; index < length; index++) {
        if (isObject(object[index])) {
          newValue[index] = cloneObject(object[index])
        } else {
          newValue[index] = object[index]
        }
      }
    } else {
      for (const key in object) {
        if (isObject(object[key])) {
          newValue[key] = cloneObject(object[key])
        } else {
          newValue[key] = object[key]
        }
      }
    }
    return newValue
  }

  function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time))
  }
  
  function random(array) {
    return array[ Math.round(Math.random() * (array.length - 1)) ]
  }

  export default {
    name: "home",
    data: () => ({
      CHIP_BLACK,
      CHIP_WHITE,
      map: MAP_DEFAULT(),

      boxSelected: null,
      boxMoviedLast: null,
      turn: CHIP_WHITE,
      isModeAI: true
    }),
    watch: {
      async turn(newVal) {
        if (newVal == CHIP_BLACK) {
          while (this.turn == CHIP_BLACK) {
            await sleep(500)
            this.eat(getBestMethod(this.map, CHIP_BLACK, true))
          }
        }
      }
    },
    computed: {
      chips() {
        return this.map.reduce((chips, row, y) => {
          chips.push(...row.map((item, x) => ({
            ...item,
            x,
            y
          })))
          return chips
        }, []).sort((a, b) => a.id - b.id)
        // phải sort nó thì con giời vue mới không râu ông nọ cắm cằm thằng kia
      },
      methodsOfTheParty() {
        return this.boxMoviedLast ? getMethodsOfTravel(this.map, this.boxMoviedLast.x, this.boxMoviedLast.y) : getMethodsOfTheParty(this.map, this.turn)
      },
      methodsOfTravelBoxSelected() {
        if (this.boxSelected) {
          const { x, y } = this.boxSelected
          return this.methodsOfTheParty.methods.filter(item => item.root.x == x && item.root.y == y)
        } else {
          return []
        }
      }
    },
    methods: {
      moveChip(x, y, xTo, yTo) {
        const tmp = this.map[y][x]
        this.$set(this.map[y], x, this.map[yTo][xTo])
        this.$set(this.map[yTo], xTo, tmp)

        this.updateKingOf(x, y)
        this.updateKingOf(xTo, yTo)
      },
      removeChip(x, y) {
        this.map[y][x].value = null
        this.map[y][x].isKing = false
      },
      changeTurn() {
        if (this.turn == CHIP_BLACK) {
          this.turn = CHIP_WHITE
        } else {
          this.turn = CHIP_BLACK
        }
      },

      eat(thisMethod, x, y) {
        this.moveChip(thisMethod.root.x, thisMethod.root.y, thisMethod.newX, thisMethod.newY)
        if (thisMethod.remove) {
          this.removeChip(thisMethod.remove.x, thisMethod.remove.y)
          this.boxMoviedLast = { x, y }

          if (!this.methodsOfTheParty.eated) {
            this.changeTurn()
            this.boxMoviedLast = null
          }
        } else {
          this.changeTurn()
        }
      },
      boxSelectMe(x, y) {
        if ((this.turn == CHIP_BLACK ? !this.isModeAI : true) && this.map[y][x].value == null) {
          this.boxMoviedLast = null
          const thisMethod = this.getInformationBoxGoto(x, y)
          if (thisMethod) {
            this.eat(thisMethod, x, y)
          }
          this.boxSelected = null
        } else {
          if (this.inMethodsOfTheParty(x, y)) {
            this.boxSelected = { x, y }
          }
        }
      },
      getInformationBoxGoto(x, y) {
        return this.methodsOfTravelBoxSelected.find(({ newX, newY }) => newX == x && newY == y)
      },
      isBoxGoto(x, y) {
        return !!this.getInformationBoxGoto(x, y)
      },
      isBoxHover(x, y) {
        return !this.boxSelected && this.methodsOfTheParty.methods.some(item => item.root.x == x && item.root.y == y)
      },
      inMethodsOfTheParty(x, y) {
        return this.methodsOfTheParty.methods.some(item => item.root.x == x && item.root.y == y)
      },
      isBoxSelect(x, y) {
        return this.boxSelected && this.boxSelected.x == x && this.boxSelected.y == y
      },
      updateKingOf(x, y) {
        if (this.map[y][x].value) {
          let isKing = false
          if (this.map[y][x].value == CHIP_BLACK) {
            isKing = y == this.map.length
          } else {
            isKing = y == 0
          }
          if (isKing) {
            this.map[y][x].isKing = isKing
          }
        }
      }
    }
  }
</script>
<style lang="scss" scoped>
  .wrap {
    position: relative;
    padding: 20px 10px;

    .board {
      width: 100%;
      padding-top: 100%;
      position: relative;
      border: 1px solid rgb(0, 0, 0, .1);

      %bg-conf {
        background: {
          size: 100%;
          position: center;
          repeat: no-repeat;
        }
      }

      &--inner {
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        display: flex;
        flex-direction: column;
        $this: ".board--inner";

        &__row {
          width: 100%;
          height: 10%;
          flex: 0 0 10%;
          position: relative;
          display: flex;
          $square-white: url("~@/assets/square_white.png");
          $square-black: url("~@/assets/square_black.png");

          &:nth-child(2n) #{$this}__col:nth-child(2n + 1),
          &:nth-child(2n + 1) #{$this}__col:nth-child(2n) {
            background-image: $square-black;
          }

          &:nth-child(2n) #{$this}__col:nth-child(2n),
          &:nth-child(2n + 1) #{$this}__col:nth-child(2n + 1) {
            background-image: $square-white;
          }

          #{$this}__col {
            position: relative;
            height: 100%;
            width: 100%;
            flex: 0 0 10%;
            @extend %bg-conf;
            $color-select: rgba(40, 117, 75, .8);
            $color-hover: rgba(103, 125, 57, .8);

            &#{$this}__col--goto:before {
              content: "";
              position: absolute;
              width: 30%;
              height: 30%;
              border-radius: 50%;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              background-color: $color-select;
            }

            &#{$this}__col--hover,
            &#{$this}__col--select {
              &:before {
                content: "";
                position: absolute;
                width: 100%;
                height: 100%;
                top: 0;
                left: 0;
              }

              &#{$this}__col--hover:before {
                background-color: $color-hover;
              }

              &#{$this}__col--select:before {
                background-color: $color-select;
              }
            }
          }
        }
      }

      .chip {
        position: absolute;
        width: 10%;
        height: 10%;
        @extend %bg-conf;
        background-size: 85%;
        transition: top .35s ease, left .35s ease;
        z-index: 1;

        @for $y from 0 to 10 {
          @for $x from 0 to 10 {
            &.chip--offset_#{$x}_#{$y} {
              top: ($y * 10%);
              left: ($x * 10%);
            }
          }
        }

        &.chip--white {
          background-image: url("~@/assets/whitechip.png");

          &.is-king {
            background-image: url("~@/assets/whitechipcrown.png");
          }
        }

        &.chip--black {
          background-image: url("~@/assets/blackchip.png");

          &.is-king {
            background-image: url("~@/assets/blackchipcrown.png");
          }
        }
      }


      &>>>.fade-enter-active,
      &>>>.fade-leave-active {
        transition: opacity .35s (.35s * 1/3) ease;
        z-index: 0;
      }

      &>>>.fade-enter,
      &>>>.fade-leave-to {
        opacity: 0;
      }
    }
  }
</style>