<template>
  <div>
    <!-- TODO move standard nav and container to component -->
    <nav class="navbar is-black" role="navigation" aria-label="main navigation">
      <div class="navbar-brand">
        <span class="navbar-item">
          <!-- TODO update logo -->
          <!-- <img
            :src="assets.logo"
            width="40"
          > -->
          <img
            src="https://soundation.com/assets/soundation-icon-light.svg?v=2"
            width="40"
          >
          Modation
        </span>
      </div>

      <div id="navbarBasicExample" class="navbar-menu">
        <div class="navbar-start"></div>

        <!-- TODO add indicator of user? -->
        <div class="navbar-end">
          <div class="navbar-item">
            <!-- <a class="button is-primary">
              <strong>Log in</strong>
            </a> -->
          </div>
        </div>
      </div>
    </nav>
    <section class="section">
      <div class="container has-text-centered">
        <!-- TODO update with new logo design animation? -->
        <img
          v-if="isLoading"
          src="https://chrome.soundation.com/images/3108a211206d9ad56ab63d278d2a27c2soundation-loader.gif"
          class="image is-128x128 is-blend-exclusion is-inline-block"
        >
        <h4
          v-else
          class="title is-4"
        >
          <div v-if="simpleData">
            {{ simpleData.title }}
          </div>
          <div v-else>
            {{ msg }}
          </div>
        </h4>
        <h5
          v-if="simpleData && simpleData.subtitle"
          class="subtitle"
        >
          {{ simpleData.subtitle }}
        </h5>
        <nav
          v-if="simpleData"
          class="level is-mobile"
        >
          <div
            v-for="(item, key) in simpleData.stats"
            :key="item.key"
            class="level-item has-text-centered"
          >
            <span class="icon">
              <i :class="item.icon" />
            </span>
            <span>{{ item.value }}</span>
          </div>
        </nav>
      </div>
    </section>
  </div>
</template>

<script>
import creme from '../services/creme'
import { samRequest } from '../services/sam'

export default {
  data() {
    return {
      // state
      isLoading: true,
      msg: 'Welcome!',
      data: {},

      // helpers
      assets: {
        logo: null
      }
    }
  },

  computed: {
    simpleData () {
      if (!this.data.stats) {
        return null
      }

      const data = {
        stats: this.data.stats
      }

      if (this.data.type === 'track') {
        return {
          title: this.data.track.title,
          subtitle: `by ${this.data.track.artist.name}`,
          ...data
        }
      }

      if (this.data.type === 'group') {
        return {
          title: this.data.group.title,
          subtitle: this.data.group.admin && `by ${this.data.group.admin.name}`,
          ...data
        }
      }

      return data
    }
  },

  created () {
    this.readAssets()
  },

  mounted () {
    console.log('mounted')

    this.readTab()
  },

  methods: {
    readAssets () {
      this.assets = {
        logo: creme.asset('icons/icon.svg')
      }
    },

    readTab () {
      this.isLoading = true

      creme.getCurrentTab(tab => {
        const { url } = tab

        console.log({ tab })

        // theory here is that WITHOUT tabs permission, the url prop is undefined
        // unless the tab matches one of the content script paths

        if (url) {
          samRequest(url).then(res => {
            // TODO samRequest will resolve as null for URLs that SAM does not cache
            if (res) {
              const { data } = res

              console.log('SAM response:', res)

              this.data = data
            } else {
              this.msg = "SAM doesn't support this page yet"
              console.log('No SAM response')
            }

            this.isLoading = false
          })
        } else {
          this.msg = 'Hey there! Click me on a Soundation tab to see more info.'
          this.isLoading = false
        }
      })
    },

    mapTrackData () {

    },

    mapGroupData () {

    }
  }
}
</script>

<style scoped lang="scss">
.navbar-item {
  display: flex;
}

.navbar,
.navbar-menu,
.navbar-start,
.navbar-end {
  align-items: stretch;
  display: flex;
  padding: 0;
}

.navbar-menu {
  flex-grow: 1;
  flex-shrink: 0;
  background-color: inherit;
}
.navbar-start {
  justify-content: flex-start;
  margin-right: auto;
}
.navbar-end {
  justify-content: flex-end;
  margin-left: auto;
}

.is-blend-exclusion {
  mix-blend-mode: exclusion;
}
</style>
