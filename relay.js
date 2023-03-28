/* eslint-disable no-console */

import { createLibp2p } from 'libp2p'
import { tcp } from '@libp2p/tcp'
import { mplex } from '@libp2p/mplex'
import { noise } from '@chainsafe/libp2p-noise'
import { pubsubPeerDiscovery } from '@libp2p/pubsub-peer-discovery'
import { circuitRelayTransport, circuitRelayServer } from 'libp2p/circuit-relay'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'

  ; (async () => {
    const relay = await createLibp2p({
      addresses: {
        listen: [
          '/ip4/0.0.0.0/tcp/0'
        ]
      },
      transports: [tcp(), circuitRelayTransport()],
      streamMuxers: [mplex()],
      connectionEncryption: [noise()],
      pubsub: gossipsub({ allowPublishToZeroPeers: true }),
      peerDiscovery: [
        pubsubPeerDiscovery({
          interval: 1000
        })
      ],
      relay: {
        enabled: true, // Allows you to dial and accept relayed connections. Does not make you a relay.
        hop: {
          enabled: true // Allows you to be a relay for other peers
        }
      }
    })
    console.log(`libp2p relay started with id: ${relay.peerId.toString()}`)

    relay.addEventListener('peer:discovery', (evt) => {
      const peer = evt.detail
      console.log(`Peer ${node1.peerId.toString()} discovered: ${peer.id.toString()}`)
    })

  })()