# Deep Drill - Art Asset List

All sprites are 16x16 pixels unless noted. Style: pixel art, earthy palette with gem highlights.

## Terrain Tiles (16x16 each)

| Asset | Filename | Description | Priority |
|-------|----------|-------------|----------|
| Soil | soil.png | Light brown, loose texture | P0 |
| Clay | clay.png | Orange-brown, denser | P0 |
| Rock | rock.png | Gray, cracks | P0 |
| Granite | granite.png | Dark gray, speckled | P1 |
| Obsidian | obsidian.png | Black, glossy highlights | P1 |
| Bedrock | bedrock.png | Very dark, impenetrable look | P2 |
| Dug/Empty | empty.png | Dark void/tunnel | P0 |

## Valuables (16x16 each)

| Asset | Filename | Description | Priority |
|-------|----------|-------------|----------|
| Coal | coal.png | Black chunks, slight shine | P0 |
| Copper | copper.png | Orange-brown ore | P0 |
| Silver | silver.png | Light gray, sparkle | P1 |
| Gold | gold.png | Yellow, strong shine | P1 |
| Ruby | ruby.png | Red gem, faceted | P1 |
| Artifact | artifact.png | Mysterious glowing object | P2 |

## Hazards (16x16 each)

| Asset | Filename | Description | Priority |
|-------|----------|-------------|----------|
| Gas Vent | gas_vent.png | Cracked tile with green wisps | P1 |
| Lava Vein | lava_vein.png | Glowing orange cracks | P1 |
| Cave-in | cave_unstable.png | Cracked ceiling look | P2 |
| Creature | creature.png | Eyes in darkness | P2 |

## Machine/Drill (variable sizes)

| Asset | Filename | Size | Description | Priority |
|-------|----------|------|-------------|----------|
| Drill Body | drill_body.png | 32x48 | Main drill machine | P0 |
| Drill Bit | drill_bit.png | 16x16 | Spinning drill tip (animation frames) | P0 |
| Drill Bit Anim | drill_bit_anim.png | 64x16 | 4-frame spin animation | P1 |
| Parachute | parachute.png | 32x24 | Deployed chute | P1 |
| Cable | cable.png | 8x16 | Repeating cable segment | P0 |

## Crane/Surface (variable sizes)

| Asset | Filename | Size | Description | Priority |
|-------|----------|------|-------------|----------|
| Crane Rail | crane_rail.png | 16x8 | Repeating rail segment | P0 |
| Crane Trolley | crane_trolley.png | 32x16 | Moving part on rail | P0 |
| Surface | surface.png | 16x16 | Ground level grass/dirt | P0 |
| Sky | sky_gradient.png | 1x64 | Vertical gradient for sky | P1 |
| Shop Building | shop.png | 48x48 | Shop structure | P1 |

## UI Elements

| Asset | Filename | Size | Description | Priority |
|-------|----------|------|-------------|----------|
| Coin Icon | ui_coin.png | 16x16 | Currency display | P0 |
| Fuel Gauge | ui_fuel.png | 64x16 | Fuel bar frame | P0 |
| Fuel Fill | ui_fuel_fill.png | 62x14 | Fuel bar fill (stretchable) | P0 |
| Armor Icon | ui_armor.png | 16x16 | Armor stat icon | P1 |
| Power Icon | ui_power.png | 16x16 | Drill power icon | P1 |
| Depth Meter | ui_depth.png | 16x64 | Depth indicator frame | P1 |
| Button | ui_button.png | 48x16 | Generic button | P0 |
| Button Hover | ui_button_hover.png | 48x16 | Hovered state | P1 |
| Panel | ui_panel.png | 9-slice | Shop/UI panel background | P0 |

## Particles (8x8 each)

| Asset | Filename | Description | Priority |
|-------|----------|-------------|----------|
| Dirt Particle | particle_dirt.png | Brown debris | P1 |
| Rock Particle | particle_rock.png | Gray debris | P1 |
| Spark | particle_spark.png | Yellow/white spark | P1 |
| Smoke | particle_smoke.png | Gray puff | P1 |
| Gem Sparkle | particle_sparkle.png | White star shape | P1 |

## Effects

| Asset | Filename | Size | Description | Priority |
|-------|----------|------|-------------|----------|
| Explosion | explosion.png | 64x16 | 4-frame explosion | P2 |
| Collection Flash | collect_flash.png | 32x32 | Burst when collecting | P1 |
| Depth Record | depth_record.png | 64x16 | "NEW RECORD" banner | P2 |

## Placeholder Colors (for shell)

Until art is ready, use these solid colors:
- Soil: #8B7355
- Clay: #CD853F
- Rock: #696969
- Granite: #2F4F4F
- Obsidian: #1C1C1C
- Bedrock: #0A0A0A
- Empty/Dug: #0D0D15
- Coal: #2D2D2D
- Copper: #B87333
- Silver: #C0C0C0
- Gold: #FFD700
- Ruby: #E0115F
- Drill: #4169E1
- Crane: #A0A0A0

---

## Priority Legend

- **P0**: Required for playable prototype
- **P1**: Required for polish pass
- **P2**: Nice to have / extension content

## Sprite Sheet Recommendation

For production, combine into sprite sheets:
- `terrain_atlas.png` - All terrain + valuables + hazards (256x64)
- `machine_atlas.png` - Drill, crane, parachute (128x64)
- `ui_atlas.png` - All UI elements (256x128)
- `particles_atlas.png` - All particles and effects (64x64)
