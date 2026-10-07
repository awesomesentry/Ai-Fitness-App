/**
 * Exercise library.
 *
 * Every exercise is home-friendly: it needs nothing more than bodyweight,
 * a resistance band, or a light dumbbell/backpack substitute.
 *
 * pattern    - movement pattern used by the generator to build balanced days
 * level      - minimum level required (1 beginner, 2 intermediate, 3 advanced)
 * equipment  - 'bodyweight' | 'band'
 * unit       - 'reps' | 'seconds' | 'reps-per-side'
 */

export const LEVELS = {
  beginner: 1,
  intermediate: 2,
  advanced: 3
}

export const PATTERNS = {
  push: 'Push',
  pull: 'Pull',
  squat: 'Squat',
  hinge: 'Hinge',
  lunge: 'Lunge',
  core: 'Core',
  cardio: 'Conditioning',
  mobility: 'Mobility'
}

export const EXERCISES = [
  // ---------------------------------------------------------------- PUSH
  {
    id: 'incline-pushup',
    name: 'Incline Push-Up',
    pattern: 'push',
    level: 1,
    equipment: 'bodyweight',
    unit: 'reps',
    muscles: ['Chest', 'Shoulders', 'Triceps'],
    cues: 'Hands on a sofa or table. Body in one straight line, elbows tucked to 45 degrees.'
  },
  {
    id: 'knee-pushup',
    name: 'Knee Push-Up',
    pattern: 'push',
    level: 1,
    equipment: 'bodyweight',
    unit: 'reps',
    muscles: ['Chest', 'Triceps'],
    cues: 'Knees down, hips locked forward. Lower the chest to a fist above the floor.'
  },
  {
    id: 'band-chest-press',
    name: 'Band Chest Press',
    pattern: 'push',
    level: 1,
    equipment: 'band',
    unit: 'reps',
    muscles: ['Chest', 'Triceps'],
    cues: 'Band behind your back, press forward and squeeze the chest at the end.'
  },
  {
    id: 'pushup',
    name: 'Push-Up',
    pattern: 'push',
    level: 2,
    equipment: 'bodyweight',
    unit: 'reps',
    muscles: ['Chest', 'Shoulders', 'Triceps'],
    cues: 'Brace the abs, lead with the chest, full lockout at the top.'
  },
  {
    id: 'band-overhead-press',
    name: 'Band Overhead Press',
    pattern: 'push',
    level: 2,
    equipment: 'band',
    unit: 'reps',
    muscles: ['Shoulders', 'Triceps'],
    cues: 'Stand on the band, press overhead without leaning back.'
  },
  {
    id: 'pike-pushup',
    name: 'Pike Push-Up',
    pattern: 'push',
    level: 2,
    equipment: 'bodyweight',
    unit: 'reps',
    muscles: ['Shoulders', 'Triceps'],
    cues: 'Hips high, head travels between the hands, elbows forward.'
  },
  {
    id: 'archer-pushup',
    name: 'Archer Push-Up',
    pattern: 'push',
    level: 3,
    equipment: 'bodyweight',
    unit: 'reps-per-side',
    muscles: ['Chest', 'Triceps'],
    cues: 'Wide hands, shift the weight onto one arm, the other stays almost straight.'
  },
  {
    id: 'deficit-pike-pushup',
    name: 'Elevated Pike Push-Up',
    pattern: 'push',
    level: 3,
    equipment: 'bodyweight',
    unit: 'reps',
    muscles: ['Shoulders', 'Triceps'],
    cues: 'Feet on a chair for a near-vertical press. Control the descent.'
  },

  // ---------------------------------------------------------------- PULL
  {
    id: 'band-row',
    name: 'Band Seated Row',
    pattern: 'pull',
    level: 1,
    equipment: 'band',
    unit: 'reps',
    muscles: ['Back', 'Biceps'],
    cues: 'Band around your feet, pull the elbows past the ribs, squeeze the shoulder blades.'
  },
  {
    id: 'band-pull-apart',
    name: 'Band Pull-Apart',
    pattern: 'pull',
    level: 1,
    equipment: 'band',
    unit: 'reps',
    muscles: ['Upper Back', 'Rear Delts'],
    cues: 'Arms straight at chest height, pull the band wide until it touches the chest.'
  },
  {
    id: 'towel-row',
    name: 'Door / Towel Row',
    pattern: 'pull',
    level: 1,
    equipment: 'bodyweight',
    unit: 'reps',
    muscles: ['Back', 'Biceps'],
    cues: 'Towel around a sturdy door handle, lean back and row your chest to your hands.'
  },
  {
    id: 'superman-pull',
    name: 'Superman Pull',
    pattern: 'pull',
    level: 1,
    equipment: 'bodyweight',
    unit: 'reps',
    muscles: ['Upper Back', 'Rear Delts'],
    cues: 'Lying face down, lift chest and squeeze the shoulder blades together, lower slowly.'
  },
  {
    id: 'reverse-snow-angel',
    name: 'Reverse Snow Angel',
    pattern: 'pull',
    level: 1,
    equipment: 'bodyweight',
    unit: 'reps',
    muscles: ['Upper Back', 'Rear Delts'],
    cues: 'Face down, arms overhead, sweep them wide to your sides without shrugging.'
  },
  {
    id: 'chair-shrug-row',
    name: 'Chair-Supported Row Hold',
    pattern: 'pull',
    level: 1,
    equipment: 'bodyweight',
    unit: 'seconds',
    muscles: ['Back', 'Biceps'],
    cues: 'Hands on a sturdy table edge, lean back straight and hold the top squeeze.'
  },
  {
    id: 'band-curl',
    name: 'Band Biceps Curl',
    pattern: 'pull',
    level: 1,
    equipment: 'band',
    unit: 'reps',
    muscles: ['Biceps'],
    cues: 'Elbows pinned to your sides, curl slowly and resist on the way down.'
  },
  {
    id: 'band-lat-pulldown',
    name: 'Band Lat Pulldown',
    pattern: 'pull',
    level: 2,
    equipment: 'band',
    unit: 'reps',
    muscles: ['Lats', 'Biceps'],
    cues: 'Anchor the band high, pull down and out, keep the chest proud.'
  },
  {
    id: 'table-inverted-row',
    name: 'Under-Table Inverted Row',
    pattern: 'pull',
    level: 2,
    equipment: 'bodyweight',
    unit: 'reps',
    muscles: ['Back', 'Biceps'],
    cues: 'Grip the table edge, body straight, pull the chest to the underside.'
  },
  {
    id: 'band-single-arm-row',
    name: 'Single-Arm Band Row',
    pattern: 'pull',
    level: 3,
    equipment: 'band',
    unit: 'reps-per-side',
    muscles: ['Back', 'Biceps'],
    cues: 'Hips square, no torso twist, one second squeeze at the top.'
  },

  // ---------------------------------------------------------------- SQUAT
  {
    id: 'box-squat',
    name: 'Chair Squat',
    pattern: 'squat',
    level: 1,
    equipment: 'bodyweight',
    unit: 'reps',
    muscles: ['Quads', 'Glutes'],
    cues: 'Sit back to lightly touch the chair, then drive up through the mid-foot.'
  },
  {
    id: 'bodyweight-squat',
    name: 'Bodyweight Squat',
    pattern: 'squat',
    level: 1,
    equipment: 'bodyweight',
    unit: 'reps',
    muscles: ['Quads', 'Glutes'],
    cues: 'Feet shoulder width, knees track over the toes, chest tall.'
  },
  {
    id: 'band-squat',
    name: 'Band Squat',
    pattern: 'squat',
    level: 2,
    equipment: 'band',
    unit: 'reps',
    muscles: ['Quads', 'Glutes'],
    cues: 'Band over the shoulders and under the feet for extra tension at the top.'
  },
  {
    id: 'tempo-squat',
    name: 'Tempo Squat (3s down)',
    pattern: 'squat',
    level: 2,
    equipment: 'bodyweight',
    unit: 'reps',
    muscles: ['Quads', 'Glutes'],
    cues: 'Three seconds down, one second pause, drive up fast.'
  },
  {
    id: 'pistol-progression',
    name: 'Assisted Pistol Squat',
    pattern: 'squat',
    level: 3,
    equipment: 'bodyweight',
    unit: 'reps-per-side',
    muscles: ['Quads', 'Glutes'],
    cues: 'Hold a door frame for balance only. Keep the heel flat.'
  },

  // ---------------------------------------------------------------- HINGE
  {
    id: 'glute-bridge',
    name: 'Glute Bridge',
    pattern: 'hinge',
    level: 1,
    equipment: 'bodyweight',
    unit: 'reps',
    muscles: ['Glutes', 'Hamstrings'],
    cues: 'Drive the heels down, squeeze the glutes, do not arch the lower back.'
  },
  {
    id: 'backpack-good-morning',
    name: 'Backpack Good Morning',
    pattern: 'hinge',
    level: 1,
    equipment: 'bodyweight',
    unit: 'reps',
    muscles: ['Hamstrings', 'Glutes'],
    cues: 'Backpack hugged to the chest, soft knees, hinge until you feel a hamstring stretch.'
  },
  {
    id: 'wall-hip-hinge',
    name: 'Wall Hip-Hinge Drill',
    pattern: 'hinge',
    level: 1,
    equipment: 'bodyweight',
    unit: 'reps',
    muscles: ['Hamstrings', 'Glutes'],
    cues: 'Back to a wall one step away, reach the hips back to tap it, flat back.'
  },
  {
    id: 'bird-dog-hold',
    name: 'Bird Dog Hold',
    pattern: 'hinge',
    level: 1,
    equipment: 'bodyweight',
    unit: 'seconds',
    muscles: ['Glutes', 'Back'],
    cues: 'On all fours, extend opposite arm and leg, hold without rotating the hips.'
  },
  {
    id: 'band-deadlift',
    name: 'Band Romanian Deadlift',
    pattern: 'hinge',
    level: 1,
    equipment: 'band',
    unit: 'reps',
    muscles: ['Hamstrings', 'Glutes', 'Back'],
    cues: 'Push the hips back with a flat back, feel the hamstrings stretch.'
  },
  {
    id: 'single-leg-bridge',
    name: 'Single-Leg Glute Bridge',
    pattern: 'hinge',
    level: 2,
    equipment: 'bodyweight',
    unit: 'reps-per-side',
    muscles: ['Glutes', 'Hamstrings'],
    cues: 'One foot planted, the other knee hugged in, hips stay level.'
  },
  {
    id: 'good-morning-band',
    name: 'Band Good Morning',
    pattern: 'hinge',
    level: 2,
    equipment: 'band',
    unit: 'reps',
    muscles: ['Hamstrings', 'Glutes'],
    cues: 'Soft knees, hinge forward to about 45 degrees, spine neutral.'
  },
  {
    id: 'nordic-negative',
    name: 'Nordic Curl Negative',
    pattern: 'hinge',
    level: 3,
    equipment: 'bodyweight',
    unit: 'reps',
    muscles: ['Hamstrings'],
    cues: 'Anchor the ankles, lower as slowly as possible, catch yourself with the hands.'
  },

  // ---------------------------------------------------------------- LUNGE
  {
    id: 'split-squat',
    name: 'Split Squat',
    pattern: 'lunge',
    level: 1,
    equipment: 'bodyweight',
    unit: 'reps-per-side',
    muscles: ['Quads', 'Glutes'],
    cues: 'Long stance, drop the back knee straight down, front heel stays down.'
  },
  {
    id: 'reverse-lunge',
    name: 'Reverse Lunge',
    pattern: 'lunge',
    level: 1,
    equipment: 'bodyweight',
    unit: 'reps-per-side',
    muscles: ['Quads', 'Glutes'],
    cues: 'Step back and down, torso upright, push through the front leg.'
  },
  {
    id: 'band-lunge',
    name: 'Band Reverse Lunge',
    pattern: 'lunge',
    level: 2,
    equipment: 'band',
    unit: 'reps-per-side',
    muscles: ['Quads', 'Glutes'],
    cues: 'Stand on the band with the front foot for loaded resistance.'
  },
  {
    id: 'bulgarian-split-squat',
    name: 'Elevated Split Squat',
    pattern: 'lunge',
    level: 3,
    equipment: 'bodyweight',
    unit: 'reps-per-side',
    muscles: ['Quads', 'Glutes'],
    cues: 'Rear foot on a chair, weight on the front leg, control the depth.'
  },

  // ---------------------------------------------------------------- CORE
  {
    id: 'dead-bug',
    name: 'Dead Bug',
    pattern: 'core',
    level: 1,
    equipment: 'bodyweight',
    unit: 'reps-per-side',
    muscles: ['Core'],
    cues: 'Ribs down, low back glued to the floor, move slowly.'
  },
  {
    id: 'plank',
    name: 'Front Plank',
    pattern: 'core',
    level: 1,
    equipment: 'bodyweight',
    unit: 'seconds',
    muscles: ['Core'],
    cues: 'Squeeze glutes and abs, neutral neck, breathe normally.'
  },
  {
    id: 'side-plank',
    name: 'Side Plank',
    pattern: 'core',
    level: 2,
    equipment: 'bodyweight',
    unit: 'seconds',
    muscles: ['Obliques', 'Core'],
    cues: 'Stack the shoulders and hips, push the bottom hip up.'
  },
  {
    id: 'hollow-hold',
    name: 'Hollow Hold',
    pattern: 'core',
    level: 2,
    equipment: 'bodyweight',
    unit: 'seconds',
    muscles: ['Core'],
    cues: 'Low back flat, arms and legs long, only lower as far as you can hold.'
  },
  {
    id: 'leg-raise',
    name: 'Lying Leg Raise',
    pattern: 'core',
    level: 2,
    equipment: 'bodyweight',
    unit: 'reps',
    muscles: ['Lower Abs'],
    cues: 'Hands under the hips, lower the legs only as far as the back stays flat.'
  },
  {
    id: 'plank-to-pushup',
    name: 'Plank Walk-Up',
    pattern: 'core',
    level: 3,
    equipment: 'bodyweight',
    unit: 'reps-per-side',
    muscles: ['Core', 'Shoulders'],
    cues: 'Forearm to hand and back with minimal hip rotation.'
  },

  // ---------------------------------------------------------- CONDITIONING
  {
    id: 'march-in-place',
    name: 'High March in Place',
    pattern: 'cardio',
    level: 1,
    equipment: 'bodyweight',
    unit: 'seconds',
    muscles: ['Full Body'],
    cues: 'Drive the knees to hip height, pump the arms, stay light on the feet.'
  },
  {
    id: 'step-touch',
    name: 'Fast Step-Touch',
    pattern: 'cardio',
    level: 1,
    equipment: 'bodyweight',
    unit: 'seconds',
    muscles: ['Full Body'],
    cues: 'Low-impact side steps. Keep a pace where you can still talk in short sentences.'
  },
  {
    id: 'mountain-climber',
    name: 'Mountain Climbers',
    pattern: 'cardio',
    level: 2,
    equipment: 'bodyweight',
    unit: 'seconds',
    muscles: ['Core', 'Full Body'],
    cues: 'Hips low and still, drive the knees quickly toward the chest.'
  },
  {
    id: 'squat-jump',
    name: 'Squat Jump',
    pattern: 'cardio',
    level: 3,
    equipment: 'bodyweight',
    unit: 'reps',
    muscles: ['Legs', 'Full Body'],
    cues: 'Land softly through the whole foot, reset your stance every rep.'
  },
  {
    id: 'burpee',
    name: 'Burpee',
    pattern: 'cardio',
    level: 3,
    equipment: 'bodyweight',
    unit: 'reps',
    muscles: ['Full Body'],
    cues: 'Chest to floor, jump the feet in, stand tall to finish.'
  },

  // ---------------------------------------------------------------- MOBILITY
  {
    id: 'cat-cow',
    name: 'Cat-Cow',
    pattern: 'mobility',
    level: 1,
    equipment: 'bodyweight',
    unit: 'reps',
    muscles: ['Spine'],
    cues: 'Move one vertebra at a time, exhale as you round the back.'
  },
  {
    id: 'worlds-greatest-stretch',
    name: "World's Greatest Stretch",
    pattern: 'mobility',
    level: 1,
    equipment: 'bodyweight',
    unit: 'reps-per-side',
    muscles: ['Hips', 'Thoracic Spine'],
    cues: 'Deep lunge, elbow to the floor inside the foot, then rotate open.'
  },
  {
    id: 'hip-circles',
    name: 'Standing Hip Circles',
    pattern: 'mobility',
    level: 1,
    equipment: 'bodyweight',
    unit: 'reps-per-side',
    muscles: ['Hips'],
    cues: 'Knee up and draw big slow circles. Hold a wall if needed.'
  },
  {
    id: 'band-shoulder-dislocate',
    name: 'Band Shoulder Pass-Through',
    pattern: 'mobility',
    level: 1,
    equipment: 'band',
    unit: 'reps',
    muscles: ['Shoulders'],
    cues: 'Wide grip, straight arms, move slowly and stop before any pinch.'
  }
]

export const WARMUP_IDS = ['cat-cow', 'hip-circles', 'worlds-greatest-stretch', 'march-in-place']
export const COOLDOWN_IDS = ['cat-cow', 'worlds-greatest-stretch', 'band-shoulder-dislocate']

export const getExerciseById = (id) => EXERCISES.find((exercise) => exercise.id === id)
