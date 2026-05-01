# Physics Topic Coverage Audit

This audit assumes the current canonical Physics taxonomy after the topic split. It is not a request to inflate counts for appearance. The goal is to distinguish:

- focused branches that are already coherent
- branches that are intentionally small but still worth extending later
- branches that now have an obvious next concept gap

Topic counts below are the current live published concept counts derived from the canonical catalog.

## Summary

| Topic | Count | Status | Coverage now | Next candidates | Priority |
| --- | ---: | --- | --- | --- | --- |
| Mechanics | 11 | Focused and complete for now | Motion language, projectile paths, circular motion, rotation, momentum, collisions | Newton’s laws and free-body diagrams; work-energy theorem; friction and inclined-force balance | Medium |
| Gravity and Orbits | 5 | Focused and complete for now | Field, potential, circular orbits, period law, escape | Elliptical orbits and orbital energy; gravitational field superposition / Lagrange-style balance | Medium |
| Oscillations | 3 | Coherent but sparse | SHM, energy in SHM, damping/resonance | Pendulum motion and small-angle breakdown; coupled oscillators; nonlinear / amplitude-dependent oscillation | High |
| Waves | 4 | Coherent but sparse | Speed-wavelength relation, Doppler, interference, standing waves | Reflection and transmission at a boundary; wave intensity / energy transport; pulse reflection on strings | High |
| Sound | 4 | Coherent but sparse | Longitudinal waves, pitch/loudness, beats, air-column resonance | Decibel scale / inverse-square intensity; strings and instrument resonance; timbre / frequency spectra | Medium |
| Fluids | 5 | Focused and complete for now | Pressure, continuity, Bernoulli, buoyancy, drag | Viscosity / laminar flow; surface tension / capillarity | Low |
| Thermodynamics | 4 | Coherent but sparse | Temperature/internal energy, kinetic theory, heat transfer, specific heat/phase change | First law / PV work; heat engines and efficiency; entropy and spontaneous direction | High |
| Electricity | 3 | Coherent but sparse | Electric field, electric potential, and capacitor charge / energy storage | Dedicated Coulomb / superposition bench if field coverage still feels too implicit; equipotential maps and field-line geometry | Medium |
| Circuits | 7 | Focused and complete for now | Basic loops, power, series/parallel, Kirchhoff balance, RC time response, equivalent resistance, non-ideal sources | AC/reactive behavior only if the product later wants a broader circuits branch | Low |
| Magnetism | 2 | Coherent but sparse | Fields from current, force on moving charges/currents | Solenoids and electromagnets; magnetic dipoles / torque on loops; Hall-effect style sign/direction intuition | High |
| Electromagnetism | 3 | Coherent but sparse | Induction, Maxwell synthesis, EM waves | Generators / transformers; displacement-current / Ampère-Maxwell as a dedicated bridge if Maxwell synthesis remains too compressed | Medium |
| Optics | 7 | Focused and complete for now | Spectrum, polarization, diffraction, double slit, refraction, dispersion, total internal reflection | Thin-film / interference colors; diffraction grating / spectra | Low |
| Mirrors and Lenses | 3 | Coherent but sparse | Mirror imaging, lens imaging, resolution limits | Optical instruments (microscope / telescope); lens combinations; aberrations / non-ideal imaging | Medium |
| Modern Physics | 5 | Coherent but sparse | Photoelectric effect, atomic spectra, matter waves, Bohr, half-life | Quantum tunneling; uncertainty / wave packets; nuclear binding / mass-energy | Medium |

## Topic notes

### Mechanics

Current coverage is already strong enough for a first-pass mechanics branch. The topic feels intentional rather than thin, and the supporting starter tracks already give it a guided entry.

Future additions should only happen if the product wants a broader “core intro physics” route. The best candidates are:

- `Newton's laws and free-body diagrams`
- `Work-energy theorem`
- `Friction and inclined-force balance`

These would all be new simulation concepts, not mere metadata changes.

### Gravity and Orbits

This branch is compact but coherent. It already has a dedicated starter track, which means it does not feel like a leftover slice of Mechanics.

Best future additions:

- `Elliptical orbits and orbital energy`
- `Multi-body gravity / balance points`

These are genuine new simulation concepts. No route or track changes are required before them.

### Oscillations

The branch is now conceptually clean, but it is the smallest of the motion-side Physics topics. It has a clear story, yet it likely wants one or two more oscillator-native concepts before it feels complete.

Best future additions:

- `Pendulum motion and the small-angle limit`
- `Coupled oscillators / normal modes`
- `Nonlinear oscillation / amplitude dependence`

Priority is high because these deepen the now-clean oscillator branch directly instead of widening into another topic.

### Waves

The wave topic now feels much more honest, but it is still a narrow slice of traveling-wave behavior. The next additions should keep the branch wave-native, not sound-native.

Best future additions:

- `Reflection and transmission at a boundary`
- `Wave intensity / energy transport`
- `Pulse reflection on strings`

This could be either new simulation concepts or, in one case, a future guided-path improvement if a boundary story can be taught by sequencing existing wave and optics pages first.

### Sound

Sound is coherent and student-facing already. It does not need filler concepts, but it would benefit from one more “measurement-facing” concept and possibly one more “instrument / resonance” concept.

Best future additions:

- `Sound intensity level / decibels`
- `Strings and instrument resonance`
- `Timbre / frequency spectra`

The first two are the strongest candidates. `Timbre` is lower priority because it may need a more complex simulation or a new visualization model.

### Fluids

Fluids feels complete enough for now. Its current branch is clear and compact, and the starter track already makes it approachable.

Any future addition is optional:

- `Viscosity / laminar flow`
- `Surface tension / capillarity`

These are low priority.

### Thermodynamics

Thermodynamics is coherent, but the branch currently stops before the first-law / work / engine story that many learners expect after gases and heat transfer.

Best future additions:

- `First law and PV work`
- `Heat engines and efficiency`
- `Entropy / direction of thermal change`

Priority is high because this topic now feels structurally ready for one more serious extension.

### Electricity

Electricity no longer feels structurally incomplete. The branch now has a clean electrostatics story: source charges create fields, fields bridge into electric potential, and capacitance turns that same voltage story into visible charge storage and stored electric energy on one bounded bench.

The topic is still compact, but it is now coherent rather than obviously missing its next core module.

Best future additions:

- `Dedicated Coulomb / superposition bench if electric field coverage still feels too implicit`
- `Equipotential maps and field-line geometry`

These are lower-pressure additions now. They should happen only if the team wants a deeper electrostatics branch rather than a broader circuits or thermodynamics expansion first.

### Circuits

Circuits now feels complete for the current product scope. The branch can already move from a single loop into power, branch structure, Kirchhoff balance, RC time response, equivalent reduction, and non-ideal source behavior without pretending the learner has entered a full electronics course.

There are still ways to widen the branch later, but none of them are urgent for the current simulation-first product shape.

Possible later additions only if the product wants a broader circuits branch:

- `AC / reactance / phase response`
- `More realistic source models or measurement surfaces`

Priority is now low compared with the remaining gaps elsewhere in Physics.

### Magnetism

Magnetism is coherent but small. It now has a much stronger identity than before, which makes the next additions easier to prioritize.

Best future additions:

- `Solenoids and electromagnets`
- `Magnetic dipoles / torque on loops`
- `Hall-effect sign and direction intuition`

The first two are the most likely high-value additions.

### Electromagnetism

Electromagnetism now has a clean “changing fields” identity. It does not need many more concepts, but one applied induction concept could make the branch feel more complete.

Best future additions:

- `Generators / transformers`
- `Dedicated Ampère-Maxwell circulation bridge if Maxwell synthesis remains too compressed`

This is medium priority because the current branch is already coherent.

### Optics

Optics feels complete for now after losing imaging. The branch still has enough depth and a clear wave-light story.

Possible later additions:

- `Thin-film interference / color`
- `Diffraction grating and spectra`

These are low priority.

### Mirrors and Lenses

This new topic works as a curated imaging branch, but it is naturally sparse. It is a good candidate for future extension rather than immediate expansion.

Best future additions:

- `Optical instruments (microscope / telescope)`
- `Lens combinations`
- `Aberrations / non-ideal imaging`

This could be partly a future guided-path improvement if the site wants an “imaging systems” path before adding all three as concepts.

### Modern Physics

Modern Physics is already coherent and not urgent, but it has room to grow if the site wants one more bounded quantum bridge.

Best future additions:

- `Quantum tunneling`
- `Uncertainty / wave packets`
- `Nuclear binding energy`

These are medium priority and should only happen if the team wants a broader modern-physics branch.

## Recommended next content backlog

If only a few Physics additions are funded next, the strongest sequence is:

1. `Pendulum motion and the small-angle limit`
2. `Reflection and transmission at a boundary`
3. `Solenoids and electromagnets`
4. `First law and PV work`
5. `Sound intensity level / decibels`

That list improves the thinnest post-split topics first without turning the repo into a giant speculative curriculum project.


