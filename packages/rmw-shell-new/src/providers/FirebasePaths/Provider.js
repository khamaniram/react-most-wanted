import PropTypes from 'prop-types'
import React, { useState, useEffect, useReducer } from 'react'
import Context from './Context'

function reducer(state, action) {
  const { type, path, value, isLoading = false, error = false } = action
  switch (action.type) {
    case 'loading_changed':
      return { ...state, [path]: { ...state[path], isLoading } }
    case 'error_changed':
      return { ...state, [path]: { ...state[path], error } }
    case 'value_changed':
      return { ...state, [path]: { ...state[path], value, isLoading, error } }
    case 'clear':
      const { [path]: clearedKey, ...rest } = state
      return { ...rest }
    case 'clear_all':
      return {}
    default:
      throw new Error()
  }
}

function getInitState(persistKey) {
  let persistedValues = {}
  try {
    persistedValues = JSON.parse(localStorage.getItem(persistKey)) || {}
  } catch (error) {
    console.warn(error)
  }
  return persistedValues
}

const Provider = ({
  children,
  firebaseApp,
  persistKey = 'firebase_database',
}) => {
  const [state, dispatch] = useReducer(reducer, getInitState(persistKey))

  useEffect(() => {
    try {
      localStorage.setItem(persistKey, JSON.stringify(state))
    } catch (error) {
      console.warn(error)
    }
  }, [state, persistKey])

  const watchPath = (path) => {
    dispatch({
      type: 'loading_changed',
      path,
      isLoading: true,
    })

    firebaseApp
      .database()
      .ref(path)
      .on(
        'value',
        (snapshot) => {
          dispatch({
            type: 'value_changed',
            path,
            value: snapshot.val(),
            isLoading: false,
            error: false,
          })
        },
        (error) => {
          dispatch({
            type: 'error_changed',
            path,
            isLoading: false,
            error,
          })
        }
      )
  }

  const unwatchPath = (path) => {
    firebaseApp.database().ref(path).off()
  }

  const getPath = (path, defaultValue) => {
    if (state[path] !== undefined) {
      return state[path].value
    } else {
      return defaultValue
    }
  }

  const isPathLoading = (path) => {
    if (state[path] !== undefined) {
      return state[path].isLoading
    } else {
      return false
    }
  }

  const getPathError = (path) => {
    if (state[path] !== undefined) {
      return state[path].error
    } else {
      return false
    }
  }

  const clearPath = (path) => {
    unwatchPath(path)
    dispatch({ type: 'clear', path })
  }

  const clearAll = () => {
    dispatch({ type: 'clear_all' })
  }

  return (
    <Context.Provider
      value={{
        watchPath,
        unwatchPath,
        getPath,
        clearPath,
        clearAll,
        isPathLoading,
        getPathError,
      }}
    >
      {children}
    </Context.Provider>
  )
}

Provider.propTypes = {
  children: PropTypes.any,
}

export default Provider