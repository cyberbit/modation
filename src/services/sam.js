import intersection from 'lodash/intersection'
import axios from 'axios'
import sortBy from 'lodash/sortBy'

import { matchAny } from './helpers'
import stats from '../constants/stats'

const baseUrl = 'https://soundation.com'
const samBaseUrl = 'https://modation.app'

const urlMatchers = {
  message: /\/account\/messages\/\d+/,
  group: /\/group\//,
  track: /\/user\/.*\/track\//,
  user: /\/user\/[^/]*$/,
  profile: /\/account\/profile/,
  general: /\/soundation.com\//,
  feed: /soundation.com\/feed/
}

const samTriggers = [
  'group',
  'track'
]

/**
 * Convert soundation.com URLs to SAM endpoint.
 *
 * @param {string} url
 */
const proxyUrl = url => url.replace(baseUrl, samBaseUrl)

/**
 * Trigger SAM using soundation URL, returning response if available
 *
 * @param {string} url
 */
const samRequest = async url => {
  const triggers = matchAny(url, urlMatchers, true)

  if (intersection(triggers, samTriggers).length) {
    const res = await axios.get(proxyUrl(url))

    const statsMapped = Object.keys(res.data.stats).map(v => {
      return {
        key: v,
        value: res.data.stats[v],
        ...stats.labels[v],
      }
    })

    res.data.stats = sortBy(statsMapped, v => stats.sort.indexOf(v.key))

    return res
  }

  return null
}

export {
  urlMatchers,
  proxyUrl,
  samRequest
}