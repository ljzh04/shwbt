# Sources

## Pokémon Showdown — primary technical source

Repository: https://github.com/smogon/pokemon-showdown

The upstream README identifies Pokémon Showdown as a JavaScript battle simulator/library and links its simulator/protocol documentation.

### Simulator API

https://github.com/smogon/pokemon-showdown/blob/master/sim/SIMULATOR.md

The current upstream simulator documentation describes `BattleStream`, player choices, and standard-IO operation.

### Simulator protocol

https://github.com/smogon/pokemon-showdown/blob/master/sim/SIM-PROTOCOL.md

The current upstream simulator protocol documents battle messages and choice requests.

### General protocol

https://github.com/smogon/pokemon-showdown/blob/master/PROTOCOL.md

Useful for transport/client integration; this is distinct from the local simulator protocol.

## Verification date

These upstream sources were checked on **2026-09-19**.

## Rule

Never copy transient upstream behavior into project assumptions without recording the exact Showdown commit used by an experiment.
