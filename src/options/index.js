import '../plugins/bootstrap'

import Vue from 'vue'
import '../assets/main.scss'

import App from './App.vue'

// eslint-disable-next-line
new Vue({
  el: '#app',
  render: h => h(App),
})
