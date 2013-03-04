#Card Games

A multiplayer "generic" card game.

##Key Concepts

In order to keep the game as generic as possible and yet playable, the following concepts are applied:

### Cards are always treated as groups

This can be used to represent a deck, multiple decks, a hand, a shared pile, and even a single discard (group with single card). So far we haven't seen any advantage of differentiating a single card from a group.

In terms of arrangement, groups can follow one of these styles:

- Stack (e.g. deck, discard pile)
- Normal, or side-by-side (e.g. public cards in Poker)
- Overlapped (e.g. a hand)

All styles can be applied horizontally or vertically.

### Groups can be owned by players

This enables two main concepts used by many card games:

- Differentiating a player's hand from public cards (like a deck or discard piles)
- Hiding cards (group of cards only visible to its owner)

### The server guarantees the integrity of the game

This is done by versioning the card groups. On each operation the version of all involved groups change and the version must be provided as part of the operation. If there are multiple operations trying to use the same version, only the first one will be accepted and the others will be discarded.

### Operations deal with card indexes, not values

This is important to make the make hiding cards possible.

### Only relevant operations are visible to others players

This allows, for instance, a player to shuffle her hand without allowing others to track where each card is going.

# Operations

- Create group of cards
- Reposition group
- Move card(s)
- Shuffle group
- Restyle group (normal/stack/overlapping - vertical/horizontal)
- Set group owner
- Flip group
