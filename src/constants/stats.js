const labels = {
  plays: {
    label: 'Plays',
    icon: 'mdi mdi-play'
  },
  likes: {
    label: 'Likes',
    icon: 'mdi mdi-heart'
  },
  downloads: {
    label: 'Downloads',
    icon: 'mdi mdi-download'
  },
  comments: {
    label: 'Comments',
    icon: 'mdi mdi-message-reply'
  },
  members: {
    label: 'Members',
    icon: 'mdi mdi-account-multiple'
  },
  followers: {
    label: 'Followers',
    icon: 'mdi mdi-bell'
  },
  tracks: {
    label: 'Tracks',
    icon: 'mdi mdi-playlist-music'
  }
}

const sort = [
  // track
  'plays',
  'likes',
  'downloads',
  'comments',

  // group
  'members',
  'followers',
  'tracks'
]

export default {
  labels,
  sort
}