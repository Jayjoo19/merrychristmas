(() => {
    window.addEventListener("load", () => {
	/* hide canva city tag*/
	document.getElementById("city").style.display = "none";

	/* target canvas and context */
	let [W, H] = [0, 0];

	const [ctx, ctx_city] = ["firework", "city"]
	.map((id) => document.getElementById(id))
	.map((cvs, i) => cvs.getContext("2d", { alpha: i === 1 }));
	/**********************/

	/* color func*/
	const hex = (int) => {
	  if (int > 255) return "ff";
	  return (int < 16 ? "0" : "") + int.toString(16)
	};
	const rgb = (r, g, b) => `0x${hex(r)}${hex(g)}${hex(b)}`;
	/*************/

	/* time lenth of animation */
	const RISE_TIME = 3000;  /* 1500 default */
	const SPARK_TIME = 8334; /* 4167 default */
	const FADE_TIME = 600;	/* 300 default */
	const UNIT_ANIMATION_TIME = 60 / 1000;
	const RENDER_START = 0;
	const RENDER_ENDED = "END";
	const FIRE_RISE = 0;
	const FIRE_SPARK = 1;
	const RESIDUAL_RATE = 0.02;
	const CLEAR = 1;
	const INTERVAL = 1800;
	/***************************/

	/* animate array length (for 60 fps) */
	const FRAME_AMOUNT = Math.round(SPARK_TIME * UNIT_ANIMATION_TIME);
	const RISE_AMOUNT = Math.round(RISE_TIME * UNIT_ANIMATION_TIME);
	const FADE_FREQ = Math.round(FADE_TIME * UNIT_ANIMATION_TIME);
	/*************************************/

	/* for physics */
	const GRAVITY = 10; //pix/s**2
	const SPEED = 2000; //pix/s
	const DISTANCE = 1000;//(z)
	const APPARENT_GRAVITY = GRAVITY / DISTANCE;
	const APPARENT_SPEED = SPEED / DISTANCE;
	/***************/

	/* for fire particle */
	const MAX_AMOUNT_OF_FIREWORKS = 6; /*alterado*/
	const FIRE_LAYER_AMOUNT = 9;
	const FIRE_LINE_AMOUNT = 30;
	const UNIT_DEGREE = 360 / FIRE_LINE_AMOUNT;
	const PARTICLE_RADIUS = 1;
	const RANDOM_DEG = 10;/*alterado */
	const RANDOM_SPEED = 10
	/*********************/

	/* fireworks color */
	const BACK_COLOR = rgb(0, 0, 18);
	const ORANGE = rgb(255, 120, 20);
	const BLUE = rgb(0, 73, 203);
	const GREEN = rgb(0, 203, 160);
	const YELLOW = rgb(180, 203, 0);
	const PURPLE = rgb(255, 0, 255);
	const WATER_BLUE = rgb(0, 255, 255);
	const WHITE = rgb(255, 255, 255);
	const COLOR_SETS = [
	  [BLUE, WATER_BLUE, WHITE],
	  [BLUE, GREEN, WHITE],
	  [BLUE, PURPLE, WHITE],
	  [GREEN, WATER_BLUE, WHITE],
	  [GREEN, YELLOW, WHITE],
	  [YELLOW, WATER_BLUE],
	  [PURPLE, WATER_BLUE],
	  [WATER_BLUE, WHITE],
	  [BLUE, WHITE],
	  [GREEN, WHITE],
	  [YELLOW, WHITE],
	  [PURPLE, WHITE],
	  [WATER_BLUE],
	  [BLUE],
	  [GREEN],
	  [PURPLE],
	  [ORANGE, BLUE],
	  [ORANGE, WATER_BLUE],
	  [ORANGE],
	  [ORANGE, GREEN],
	  [ORANGE, YELLOW],
	  [ORANGE, GREEN, BLUE],
	  [BLUE, YELLOW],
	];
	/*********************/

	/* city */
	const CITY_COLOR = rgb(100, 255, 255);
	const GROUND_COLOR = rgb(100, 200, 200);
	let CITY_HEIGHT = 0;
	/********/

	// var rendering = PIXI.autoDetectRenderer({ transparent: true });
	// document.body.appendChild(rendering.view);

	/* PIXI instance */
	const TEXTURE_RADIUS = 500;
	const REDUCTION_RATIO = PARTICLE_RADIUS / TEXTURE_RADIUS;
	const renderer = new PIXI.Renderer({
	  resolution: 1,
	  autoDensity: true,
	  transparent: true,
	//   backgroundColor:0x0,
	  antialias: true
	});
	renderer.resize(W, H);


	const stage = new PIXI.ParticleContainer(
	  MAX_AMOUNT_OF_FIREWORKS*
	  (FIRE_LAYER_AMOUNT * FIRE_LINE_AMOUNT + RISE_AMOUNT),
	  {
		position: true,
		scale: true,
		tint: true
	  }
	);

	const CIRCLE_TEXTURE  = renderer.generateTexture(
	  new PIXI.Graphics()
	  .beginFill(0xffffff, 1)
	  .drawCircle(0, 0, TEXTURE_RADIUS)
	  .endFill()
	);
	/*****************/

	/* fireworks variable */
	let fireworks = [];
	let fade_count = 0;
	let render_end = false;
	/**********************/

	/* classes */
	class Position {
	  constructor(position_x, position_y) {
		[this._x, this._y] = [position_x, position_y];
	  }

	  get x() {
		return this._x;
	  }

	  get y() {
		return this._y;
	  }

	  static get_random_position(height_min, height_max) {
		return new this(
		  Util.rand_range(W*0.1, W*0.9),
		  Util.rand_range(H*height_min, H*height_max)
		);
	  }
	}


	class Vector {
	  constructor(degree, speed) {
		const rad = degree * (Math.PI / 180);
		[this._vector_y, this._vector_x] =
		  [Math.sin(rad), Math.cos(rad)].map((i) => i*speed);
	  }

	  get y() {
		return this._vector_y;
	  }

	  get x() {
		return this._vector_x;
	  }
	}


	class PositionMapper {
	  constructor(init_vector, init_position, acceleration) {
		[this._vector, this._position, this._acceleration] =
		  [init_vector, init_position, acceleration];
	  }

	  calc_position(passed_time) {
		return new Position(
		  this._position.x + this._vector.x * passed_time,
		  this._position.y + (
			this._vector.y + 0.5 * this._acceleration * passed_time
		  ) * passed_time
		);
	  }
	}

	class FireParticle extends PIXI.Sprite {
	  constructor(texture) {
		super(texture);

		this.anchor.set(0.5)
	  }

	  add_to(container) {
		container.addChild(this);
		return this;
	  }

	  is_offscreen() {
		return (
			 this.position.x - this.width/2 >= W
		  || this.position.y - this.height/2 >= H
		  || this.position.x + this.width/2 <= 0
		  || this.position.y + this.height/2 <= 0
		);
	  }

	  move_to(position) {
		this.position.set(position.x, position.y);
		return this;
	  }

	  set_alpha(alpha) {
		this.alpha = alpha;
		return this;
	  }

	  set_color(color) {
		this.tint = color;
		return this;
	  }

	  set_scale(scale) {
		this.scale.set(scale);
		return this;
	  }

	  remove_from(container) {
		container.removeChild(this);
		return this;
	  }
	}
	/******************/

	/* static classes */
	class Animator {
	  static animate() {
		requestAnimationFrame(() => this.animate());

		if (fireworks.length === 0) return;

		this.render();
		Util.make_residual(ctx, RESIDUAL_RATE);
		renderer.render(stage);
		ctx.drawImage(renderer.view, 0, 0);
	  }

	  static render() {
		const firework_has_completed = fireworks
		.map((i, fireworks_index) => this.render_unit(fireworks_index))
		.filter((render_result) => render_result === RENDER_ENDED).length === fireworks.length;

		if (!firework_has_completed) {
		  return;
		}

		if (fade_count !== FADE_FREQ) {
		  Util.make_residual(ctx, 0.1);
		  ++fade_count;
		  return;
		}

		fireworks.length = 0;
		ctx.fillRect(0, 0, W, H);
		render_end = true;
	  }

	  static render_unit(fireworks_index) {
		const target_fireworks = fireworks[fireworks_index];
		switch(target_fireworks.current_animate_type) {
		  case FIRE_RISE:
			if (RENDER_ENDED !== this.render_fire_rise(fireworks_index)) {
			 break;
			}
			target_fireworks.current_animate_type = FIRE_SPARK;
			target_fireworks.current_animate_index = RENDER_START - 1;
			break;
		  case FIRE_SPARK:
			if (RENDER_ENDED !== this.render_fire_spark(fireworks_index))
			  break;
			return RENDER_ENDED;
		}

		target_fireworks.current_animate_index++;
	  }

	  static render_fire_rise(fireworks_index) {
		const current_animate_index = fireworks[fireworks_index].current_animate_index;
		const target_rise = fireworks[fireworks_index].rise

		if (current_animate_index >= RISE_AMOUNT){
		  target_rise.particle.remove_from(stage);
		  return RENDER_ENDED;
		}
		if (!target_rise.particle.alpha) target_rise.particle.alpha = 1;
		target_rise.particle.move_to(target_rise.positions[current_animate_index]);
	  }

	  static render_fire_spark(fireworks_index) {
		const current_animate_index = fireworks[fireworks_index].current_animate_index;

		const alpha = 1 - (current_animate_index / FRAME_AMOUNT);
		const target_particles = fireworks[fireworks_index].particle;

		if (current_animate_index >= FRAME_AMOUNT) {
		  for (let i = 0; i< target_particles.length; i++) {
			target_particles[i].particle.remove_from(stage);
		  }
		  return RENDER_ENDED;
		}

		let target_particle;
		for (let i = 0; i < target_particles.length; i++) {
		  target_particle = target_particles[i];

		  target_particle.particle
		  .move_to(target_particle.positions[current_animate_index])
		  .set_alpha(alpha);
		}
	  }
	}


	class OrbitCalculator {
	  static calc_new_fireworks(center) {
		const particle = this.calc_fire_particle(center);
		const rise = this.calc_fire_rise(center);

		const color_set = COLOR_SETS[Util.rand_range(0, COLOR_SETS.length)];
		const color = [...Array(FIRE_LAYER_AMOUNT)].map(() => Util.get_color(color_set));

		return {
		  rise: rise,
		  particle: particle,
		  current_animate_type: FIRE_RISE,
		  current_animate_index: RENDER_START
		}
	  }

	  static pre_render() {
		const result = [...Array(MAX_AMOUNT_OF_FIREWORKS)]
		for (let i = 0; i < result.length; i++) {
		  result[i] = this.calc_new_fireworks(
			Position.get_random_position(0.1, 0.5)
		  )
		}

		return result;
	  }

	  static calc_fire_particle(center) {
		const color_set = COLOR_SETS[Util.rand_range(0, COLOR_SETS.length)];

		let count = 0;
		let mapper;
		let color;

		const vectors = [...Array(FIRE_LAYER_AMOUNT * FIRE_LINE_AMOUNT)];
		const positions = [...Array(FRAME_AMOUNT)];
		for (let layer_index = 0; layer_index < FIRE_LAYER_AMOUNT; layer_index++) {
		  color = Util.get_color(color_set);
		  for (let line_index = 0; line_index < FIRE_LINE_AMOUNT; line_index++) {
			mapper = new PositionMapper(
			  new Vector(
				UNIT_DEGREE * line_index + Math.random() * RANDOM_DEG,
				APPARENT_SPEED * ((layer_index + 1) / FIRE_LAYER_AMOUNT) + Math.random() / RANDOM_SPEED
			  ),
			  center,
			  APPARENT_GRAVITY
			);

			for (let frame_index = 0; frame_index < FRAME_AMOUNT; frame_index++) {
			  positions[frame_index] = mapper.calc_position(frame_index);
			}

			vectors[count] = {
			  positions: [].concat(positions),
			  particle: new FireParticle(CIRCLE_TEXTURE)
						.set_scale(REDUCTION_RATIO)
						.set_color(color)
						.set_alpha(0)
						.add_to(stage)
			};
			count++;
		  }
		}

		return vectors;
	  }

	  static calc_fire_rise(center) {
		const unit_flow = (H - center.y) / RISE_AMOUNT;
		const positions = [...Array(RISE_AMOUNT)];
		for (let i = 0; i < positions.length; i++) {
		  positions[i] = new Position(center.x + Math.random()*5, H - i*unit_flow)
		}

		return {
		  particle: new FireParticle(CIRCLE_TEXTURE)
					.set_scale(REDUCTION_RATIO)
					.set_alpha(0)
					.add_to(stage),
		  positions: positions
		}
	  }
	}


	class Util {
	  static rand_range(min, max) {
		return Math.floor(Math.random() * Math.floor(max - min)) + min;
	  }

	  static make_residual(context, alpha) {
		context.globalAlpha = alpha;
		context.fillRect(0, 0, W, H);
		context.globalAlpha = 1;
	  }

	  static decide_center(event) {
		const positionX = event.target.offsetLeft + window.pageXOffset;
		const positionY = event.target.offsetTop + window.pageYOffset;

		const [x, y] = [event.pageX - positionX, event.pageY - positionY];
		return new Position(x, y);
	  }

	  static get_color(color_set) {
		return color_set[Util.rand_range(0, color_set.length)];
	  }

	  static make_star() {
		const color_func = this.get_white_random();

		let position;
		for(let i = 0; i < H*W/1000; i++) {
		  ctx_city.fillStyle = color_func(0.7);
		  position = new Position(
			Util.rand_range(0, W),
			Util.rand_range(0, H)
		  );

		  ctx_city.fillRect(position.x, position.y, 1, 1);
		}
	  }

	  static make_gradiation(ctx, top, bottom, top_color, bottom_color) {
		const grd = ctx.createLinearGradient(0, top, 0, bottom);

		grd.addColorStop(0.0, top_color);
		grd.addColorStop(1.0, bottom_color);

		return grd;
	  }

	  static draw_line(ctx, begin_point, line_paths) {
		ctx.beginPath();
		ctx.moveTo(begin_point.x, begin_point.y);
		for (const path of line_paths) {
		  ctx.lineTo(path.x, path.y);
		}
		ctx.fill();
	  }

	  static make_ground() {
		const RATE = 0.30;
		ctx_city.fillStyle = this.make_gradiation(
		  ctx_city,
		  H - CITY_HEIGHT*RATE,
		  H,
		  "rgb(50, 205, 235)",
		  "rgb(25, 50, 50)"
		);

		ctx_city.fillRect(
		  0,
		  H - CITY_HEIGHT*RATE,
		  W,
		  CITY_HEIGHT*RATE
		);

		ctx_city.fillStyle = this.make_gradiation(
		  ctx_city,
		  H-CITY_HEIGHT*RATE,
		  H,
		  "rgb(0, 30, 40)",
		  "rgb(100, 200, 200)"
		);

		this.draw_line(
		  ctx_city,
		  new Position(W*0.5, H-CITY_HEIGHT*RATE),
		  [new Position(0 - W*0.3, H), new Position(W * 1.3, H)]
		);
	  }

	  static make_city() {
		ctx_city.fillStyle = this.make_gradiation(
		  ctx_city,
		  CITY_HEIGHT,
		  H*0.9,
		  "rgb(100, 255, 255)",
		  "rgb(0, 0, 18)"
		);

		ctx_city.globalAlpha = 0.9;
		let [left, top, width, height] = [0, 0, 0, 0]
		for (let i = 0; i < 2; i++) {
		  [left, top, width, height] = [0, 0, 0, 0];
		  while(left <= W) {
			left += width + this.rand_range(10, 15);
			width = W*0.006 + this.rand_range(10, 20);
			height = Util.rand_range(CITY_HEIGHT*0.5, CITY_HEIGHT);
			top = H - height;
			ctx_city.fillRect(left, top, width, height);
		  }
		}
		ctx_city.globalAlpha = 1;
	  }

	  static get_white_random() {
		return (alpha) => {
			return `
			  rgba(
				${Util.rand_range(100, 255)},
				${Util.rand_range(180, 255)},
				${Util.rand_range(180, 255)},
				${alpha}
			  )
			`
		 };
	  }

	  static init() {
		[W, H] = [window.innerWidth, window.innerHeight];

		renderer.resize(W, H);

		[ctx, ctx_city]
		.map((context) => context.canvas)
		.map((canvas) => [canvas.width, canvas.height] = [W, H])

		//ctx.fillStyle = "rgb(236, 239, 241)";
		ctx.fillRect(0, 0, W, H);

		CITY_HEIGHT = H*0.4;
		////Util.make_star();
		Util.make_city();
		Util.make_ground();
	  }
	}
	/******************/

	window.addEventListener(
	  "resize",
	  () => {
		if (navigator.userAgent.match(/iPhone|iPad|Android/))
		  return;

		requestAnimationFrame(Util.init);
	  },
	  false
	);

	window.addEventListener(
	  "orientationchange",

	  () => requestAnimationFrame(Util.init),
	  false
	);

	Util.init();
	Animator.animate();

	let _pre = OrbitCalculator.pre_render();
	(function loop(count) {
	  if (render_end) {
		render_end = false;
		_pre = OrbitCalculator.pre_render();
		loop(0);
		return;
	  }

	  if (count === MAX_AMOUNT_OF_FIREWORKS) {
        setTimeout(function(){ document.getElementById("firework").style.display="none"; }, 10000);
		return false;
	  } else {
		fireworks.push(_pre[count]);
	  }

	  setTimeout(() => loop(++count), INTERVAL);
	})(0);
});
  })();