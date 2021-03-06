import Duck from '../../src/extensible-duck';
import _ from 'lodash'

describe('Duck', () => {
  describe('constructor', () => {
    it('transforms types in object with prefix', () => {
      expect(new Duck({
        namespace: 'app',
        store:     'users',
        types:     [ 'FETCH' ]
      }).types).to.eql({ FETCH: 'app/users/FETCH' })
    })
    it('lets the creators reference the duck instance', () => {
      const duck = new Duck({
        types:   [ 'FETCH' ],
        creators: ({ types }) => ({
          get: (id) => ({ type: types.FETCH, id })
        })
      })
      expect(duck.creators.get(15)).to.eql({ type: duck.types.FETCH, id: 15 })
    })
    it('lets the initialState reference the duck instance', () => {
      const duck = new Duck({
        consts: { statuses: [ 'NEW' ] },
        initialState: ({ statuses }) => ({ status: statuses.NEW })
      })
      expect(duck.initialState).to.eql({ status: 'NEW' })
    })
    it('accepts the initialState as an object', () => {
      const duck = new Duck({
        initialState: ({ obj: {} })
      })
      expect(duck.initialState).to.eql({ obj: {} })
    })
    it('creates the constant objects', () => {
      const duck = new Duck({
        consts: { statuses: [ 'READY', 'ERROR' ] }
      })
      expect(duck.statuses).to.eql({ READY: 'READY', ERROR: 'ERROR' })
    })
  })
  describe('reducer', () => {  
    it('lets the original reducer reference the duck instance', () => {
      const duck = new Duck({
        types:   [ 'FETCH' ],
        reducer: (state, action, { types }) => {
          switch(action.type) {
            case types.FETCH:
              return { worked: true }
            default:
              return state
          }
        }
      })
      expect(duck.reducer({}, { type: duck.types.FETCH })).to.eql({ worked: true })
    })
    it('passes the initialState to the original reducer when state is undefined', () => {
      const duck = new Duck({
        initialState: { obj: {} },
        reducer: (state, action) => {
          return state
        }
      })
      expect(duck.reducer(undefined, { type: duck.types.FETCH })).to.eql({ obj: {} })
    })
  })
  describe('extend', () => {  
    it('creates a new Duck', () => {
      expect(new Duck({}).extend({}).constructor.name).to.eql('Duck')
    })
    it('copies the attributes to the new Duck', () => {
      const duck = new Duck({ initialState: { obj: null } })
      expect(duck.extend({}).initialState).to.eql({ obj: null })
    })
    it('copies the original consts', () => {
      const duck = new Duck({ consts: { statuses: [ 'NEW' ]} })
      expect(duck.extend({}).statuses).to.eql({ 'NEW': 'NEW' })
    })
    it('overrides the types', () => {
      const duck = new Duck({ namespace: 'ns', store: 'x', types: [ 'FETCH' ] })
      expect(duck.extend({ namespace: 'ns2', store: 'y' }).types).to.eql({ FETCH: 'ns2/y/FETCH' })
    })
    it('merges the consts', () => {
      const duck = new Duck({ consts: { statuses: [ 'READY' ] } })
      expect(duck.extend({ consts: { statuses: [ 'FAILED' ] } }).statuses).to.eql({
        READY: 'READY',
        FAILED: 'FAILED'
      })
    })
    it('appends new types', () => {
      expect(new Duck({}).extend({
        namespace: 'ns2',
        store: 'y',
        types: ['RESET']
      }).types).to.eql({ RESET: 'ns2/y/RESET' })
    })
    it('appends the new reducers', () => {
      const duck = new Duck({
        creators: () => ({
          get: () => ({ type: 'GET' })
        })
      })
      const childDuck = duck.extend({
        creators: () => ({
          delete: () => ({ type: 'DELETE' })
        })      
      })
      expect(_.keys(childDuck.creators)).to.eql([ 'get', 'delete' ])
    })
    it('lets the reducers access the parents', () => {
      const d1 = new Duck({
        creators: () => ({
          get: () => ({ d1: true })
        })
      })
      const d2 = d1.extend({
        creators: (duck, parent) => ({
          get: () => ({ ...parent.get(duck), d2: true })
        })
      })
      const d3 = d2.extend({
        creators: (duck, parent) => ({
          get: () => ({ ...parent.get(duck), d3: true })
        })
      })
      expect(d3.creators.get()).to.eql({ d1: true, d2: true, d3: true })
    })
    it('updates the old creators with the new properties', () => {
      const duck = new Duck({
        namespace: 'a', store: 'x',
        types: [ 'GET' ],
        creators: ({ types }) => ({
          get: () => ({ type: types.GET })
        })
      })
      const childDuck = duck.extend({ namespace: 'b', store: 'y' })
      expect(childDuck.creators.get()).to.eql({ type: 'b/y/GET' })
    })
    it('adds the new reducer keeping the old ones', () => {
      const parentDuck = new Duck({
        reducer: (state, action) => {
          switch(action.type) {
            case 'FETCH':
              return { ...state, parentDuck: true }
            default:
              return state
          }
        }
      })
      const duck = parentDuck.extend({
        reducer: (state, action) => {
          switch(action.type) {
            case 'FETCH':
              return { ...state, duck: true }
            default:
              return state
          }
        }
      })
      expect(duck.reducer({}, { type: 'FETCH' })).to.eql({ parentDuck: true, duck: true })
    })
    it('does not affect the original duck', () => {
      const parentDuck = new Duck({
        reducer: (state, action) => {
          switch(action.type) {
            case 'FETCH':
              return { ...state, parentDuck: true }
            default:
              return state
          }
        }
      })
      const duck = parentDuck.extend({
        reducer: (state, action) => {
          switch(action.type) {
            case 'FETCH':
              return { ...state, duck: true }
            default:
              return state
          }
        }
      })
      expect(parentDuck.reducer({}, { type: 'FETCH' })).to.eql({ parentDuck: true })
    })
    it('passes the parent initialState to the child', () => {
      const parentDuck = new Duck({ initialState: { parent: true } })
      const duck = parentDuck.extend({
        initialState: (duck, parentState) => {
          return { ...parentState, child: true }
        }
      })
      expect(duck.initialState).to.eql({ parent: true, child: true })
    })
  })
})
