document.addEventListener('DOMContentLoaded', () => {
	const grid = document.getElementById('grid');
	const search = document.getElementById('search');
	const playBtn = document.getElementById('play');
	const detailsBtn = document.getElementById('details');
	const preview = document.getElementById('preview');
	const tpl = document.getElementById('gameCard');

	// Lista de Jogos — tem que colocar os jogos
	const games = [
		// preencha o caminho do executável conforme seu sistema. Exemplo abaixo assume D:/Privado/HTML/Launcher/Jogos/Level Devil/LevelDevil.exe
		{id:1,title:'Jogo 1',img:'https://picsum.photos/seed/divinity/400/600',desc:'RPG tático.'},
		{id:2,title:'Level Devil Kz',img:'Jogos/Level Devil/imagens/Capa Levil Devil Kz.png',desc:'plataforma 2D', exePath: 'Jogos/Level Devil/index.html'},
		{id:3,title:'Jogo 3',img:'https://picsum.photos/seed/dd/400/600',desc:'Beat em up retrô.'},
		{id:4,title:'Jogo 4',img:'https://picsum.photos/seed/dbz/400/600',desc:'Lutas épicas.'},
		{id:5,title:'Jogo 5',img:'https://picsum.photos/seed/duke/400/600',desc:'Ação e humor.'},
		{id:6,title:'Jogo 6',img:'https://picsum.photos/seed/dirt/400/600',desc:'Corridas off-road.'},
		{id:7,title:'Jogo 7',img:'https://picsum.photos/seed/dish/400/600',desc:'Stealth e ação.'},
		{id:8,title:'Jogo 8',img:'https://picsum.photos/seed/dust/400/600',desc:'Aventura indie.'}
	];

	let filtered = games.slice();
	let selectedIndex = -1;

	function createCard(game){
		const node = tpl.content.cloneNode(true);
		const article = node.querySelector('.card');
		const img = node.querySelector('.thumb');
		const title = node.querySelector('.title');
		img.src = game.img;
		img.alt = `Capa de ${game.title}`;
		title.textContent = game.title;

		article.dataset.id = game.id;

		article.addEventListener('click', ()=> selectById(game.id));
		article.addEventListener('keydown', (ev)=>{
			if(ev.key === 'Enter') selectById(game.id);
		});

		return article;
	}

	function render(list){
		grid.innerHTML = '';
		list.forEach(g=> grid.appendChild(createCard(g)));
		// reset selection
		selectedIndex = -1;
		updateSelection();
	}

	function updateSelection(){
		const cards = Array.from(grid.querySelectorAll('.card'));
		cards.forEach((c,i)=>{
			c.classList.toggle('selected', i === selectedIndex);
			c.setAttribute('tabindex', 0);
		});

		if(selectedIndex >=0 && cards[selectedIndex]){
			const id = cards[selectedIndex].dataset.id;
			const g = filtered.find(x=>String(x.id) === String(id));
			preview.textContent = `${g.title} — ${g.desc}`;
			playBtn.disabled = false;
			detailsBtn.disabled = false;
			// focus visual
			cards[selectedIndex].focus();
		} else {
			preview.textContent = 'Selecione um jogo para ver detalhes';
			playBtn.disabled = true;
			detailsBtn.disabled = true;
		}
	}

	function selectById(id){
		const idx = filtered.findIndex(g=>String(g.id) === String(id));
		if(idx >=0) selectedIndex = idx;
		updateSelection();
	}

	function filter(q){
		q = (q||'').trim().toLowerCase();
		filtered = games.filter(g=> g.title.toLowerCase().includes(q));
		render(filtered);
	}

	// eventos
	search.addEventListener('input', ()=> filter(search.value));

	document.addEventListener('keydown', (ev)=>{
		// navegação por setas
		if(grid.children.length === 0) return;
		if(ev.key === 'ArrowRight'){
			selectedIndex = Math.min(filtered.length-1, (selectedIndex === -1 ? 0 : selectedIndex + 1));
			updateSelection();
			ev.preventDefault();
		} else if(ev.key === 'ArrowLeft'){
			selectedIndex = Math.max(-1, selectedIndex - 1);
			updateSelection();
			ev.preventDefault();
		} else if(ev.key === 'ArrowDown'){
			// pular uma coluna aproximada
			const cols = Math.max(1, Math.floor(grid.clientWidth / 180));
			selectedIndex = Math.min(filtered.length-1, (selectedIndex === -1 ? 0 : selectedIndex + cols));
			updateSelection();
			ev.preventDefault();
		} else if(ev.key === 'ArrowUp'){
			const cols = Math.max(1, Math.floor(grid.clientWidth / 180));
			selectedIndex = Math.max(-1, selectedIndex - cols);
			updateSelection();
			ev.preventDefault();
		}
	});

	/**
	 * Tenta lançar o executável do jogo.
	 * Estratégia:
	 * 1) Se rodando dentro do Electron, usa child_process.spawn
	 * 2) Tenta abrir via file:// (pode ser bloqueado pelo navegador)
	 * 3) Copia caminho para clipboard e avisa o usuário (fallback)
	 */
	function tryLaunchGame(g){
		if(!g || !g.exePath){
			alert('Caminho do executável não encontrado para este jogo.');
			return;
		}

		const isElectron = (typeof navigator === 'object' && typeof navigator.userAgent === 'string' && navigator.userAgent.toLowerCase().includes('electron'))
			|| (typeof window !== 'undefined' && window.process && window.process.versions && window.process.versions.electron);

		if(isElectron){
			try{
				const child_process = require && typeof require === 'function' ? require('child_process') : null;
				if(child_process){
					// spawn detached so the launcher can exit independently
					const child = child_process.spawn(g.exePath, [], {detached:true, stdio:'ignore'});
					child.unref && child.unref();
					alert(`${g.title} iniciado pelo Electron.`);
					return;
				}
			}catch(err){
				console.error('Erro ao tentar lançar pelo Electron', err);
			}
		}

		// tentativa para arquivos HTML locais: abrir no player embutido (iframe)
		try{
			const isHtml = typeof g.exePath === 'string' && /\.html?$/.test(g.exePath.toLowerCase());
			const rawPath = String(g.exePath);
			if(isHtml){
				// se for um arquivo relativo local, transforma em URL relativa ao HTML
				let url = rawPath.replace(/\\\\/g, '/');
				if(!url.match(/^[a-zA-Z]+:\/\//) && !url.startsWith('/')){
					// caminho relativo -> relativo ao arquivo Launcher.html
					url = url;
				}
				url = encodeURI(url);
				// carregar no iframe do player
				const overlay = document.getElementById('playerOverlay');
				const frame = document.getElementById('playerFrame');
				frame.src = url;
				overlay.hidden = false;
				return;
			} else {
				// tenta abrir arquivo/executável via file:// (pode ser bloqueado)
				let path = rawPath.replace(/\\\\/g, '/');
				let fileUri = path.match(/^([a-zA-Z]:)/) ? 'file:///' + path : path;
				fileUri = encodeURI(fileUri);
				const a = document.createElement('a');
				a.href = fileUri;
				a.target = '_blank';
				a.rel = 'noopener';
				document.body.appendChild(a);
				a.click();
				a.remove();
				setTimeout(()=>{
					alert(`Tentativa de abrir ${g.title} enviada. Se nada aconteceu, o navegador pode bloquear essa ação.`);
				}, 200);
				return;
			}
		}catch(err){
			console.warn('Erro ao abrir via file:// ou window.open', err);
		}

		// fallback: copiar caminho e instruções
		if(navigator.clipboard && navigator.clipboard.writeText){
			navigator.clipboard.writeText(g.exePath).then(()=>{
				alert(`Caminho do executável copiado para a área de transferência:\n${g.exePath}\nCole no Explorador e execute o .exe.`);
			}).catch(()=>{
				prompt('Copie manualmente o caminho do executável abaixo:', g.exePath);
			});
		} else {
			prompt('Copie manualmente o caminho do executável abaixo:', g.exePath);
		}
	}

	playBtn.addEventListener('click', ()=>{
		if(selectedIndex < 0) return;
		const g = filtered[selectedIndex];
		// tenta executar o jogo
		tryLaunchGame(g);
	});

	detailsBtn.addEventListener('click', ()=>{
		if(selectedIndex < 0) return;
		const g = filtered[selectedIndex];
		alert(`${g.title}\n\n${g.desc}`);
	});

	// evento de embaralhar removido

	// render inicial
	render(games);

	// player controls
	const playerOverlay = document.getElementById('playerOverlay');
	const playerClose = document.getElementById('playerClose');
	const playerFullscreen = document.getElementById('playerFullscreen');

	playerClose && playerClose.addEventListener('click', ()=>{
		// se estiver em fullscreen, saia primeiro e esconda o overlay após o evento fullscreenchange
		const frame = document.getElementById('playerFrame');
		const exitAndHide = ()=>{
			frame && (frame.src = 'about:blank');
			playerOverlay.hidden = true;
			document.removeEventListener('fullscreenchange', onFsChange);
		};

		const onFsChange = ()=>{
			// quando sair do fullscreen, esconda
			if(!document.fullscreenElement) exitAndHide();
		};

		if(document.fullscreenElement){
			document.addEventListener('fullscreenchange', onFsChange);
			document.exitFullscreen && document.exitFullscreen();
			// fallback: se o evento não disparar, esconda após 700ms
			setTimeout(()=>{ if(!document.fullscreenElement) exitAndHide(); }, 800);
		} else {
			exitAndHide();
		}
	});

	// fechar com Esc quando o player estiver aberto
	document.addEventListener('keydown', (ev)=>{
		if(ev.key === 'Escape'){
			if(playerOverlay && !playerOverlay.hidden){
				playerClose && playerClose.click();
			}
		}
	});

	playerFullscreen && playerFullscreen.addEventListener('click', ()=>{
		const shell = document.querySelector('.player-shell');
		if(!document.fullscreenElement){
			shell.requestFullscreen && shell.requestFullscreen();
		} else {
			document.exitFullscreen && document.exitFullscreen();
		}
	});
});

