const express = require('express');

const app = express();

const server = app.listen(3001, function()
{
	console.log('server running on port 3001');
});

const io = require('socket.io')(server, {
	cors: {
		origin: '*',
	},
});

const buildCard = name =>
{
	return { x: 100, y: 100, name: name, isBack: true, position: 1, rotation: 0 };
};

// Card list by scenario
const scenarii = {
	demo: ['69',
		   '42',
		   '46',
		   '16',
		   '35',
		   '25',
		   '48',
		   '21',
		   '11'],
	christmas: ['2',
				'51',
				'5',
				'67',
				'14',
				'34',
				'39',
				'69',
				'42',
				'84',
				'92',
				'35',
				'93',
				'86',
				'50',
				'52',
				'63',
				'68',
				'72',
				'99',
				'19',
				'23',
				'78',
				'65',
				'97'],

};

let cardsOnBoard       = [];
let cardsOnPick        = [];
let cardsOnDiscard     = [];
let scenarioInProgress = '';

io.on('connection', function(socket)
{
	if (scenarioInProgress !== '')
	{
		socket.emit('SCENARIO_IN_PROGRESS', scenarioInProgress);
		socket.emit('CARD_STACKS', { cardsOnBoard: cardsOnBoard, cardsOnPick: cardsOnPick, cardsOnDiscard: cardsOnDiscard });
	}

	socket.on('ABANDON_CURRENT_GAME', () =>
	{
		scenarioInProgress = '';
		socket.emit('ABANDON_CURRENT_GAME');
		cardsOnBoard   = [];
		cardsOnDiscard = [];
		cardsOnPick    = [];
	});

	socket.on('SCENARIO_CHOSEN', scenarioChosen =>
	{
		scenarioInProgress = scenarioChosen;
		if (!hasBeenInit())
		{
			cardsOnPick = [];
			for (const cardName of scenarii[scenarioInProgress])
			{
				cardsOnPick.push(buildCard(cardName));
			}
			cardsOnBoard = [buildCard('start')];
		}
		socket.emit('CARD_STACKS', { cardsOnBoard: cardsOnBoard, cardsOnPick: cardsOnPick, cardsOnDiscard: cardsOnDiscard });
	});

	socket.on('CARD_RETURNED', function({ name, isBack })
	{
		for (const card of cardsOnBoard)
		{
			if (card.name === name)
			{
				card.isBack = isBack;

				io.emit('CARD_RETURNED_' + name, isBack);
				return;
			}
		}
	});

	socket.on('CARD_FROM_PICK_TO_BOARD', cardName =>
	{
		moveCardIntoStack(cardsOnPick, cardsOnBoard, cardName);
	});

	socket.on('CARD_FROM_BOARD_TO_PICK', cardName =>
	{
		moveCardIntoStack(cardsOnBoard, cardsOnPick, cardName);
	});

	socket.on('CARD_FROM_BOARD_TO_DISCARD', cardName =>
	{
		moveCardIntoStack(cardsOnBoard, cardsOnDiscard, cardName);
	});

	socket.on('CARD_FROM_DISCARD_TO_BOARD', cardName =>
	{
		moveCardIntoStack(cardsOnDiscard, cardsOnBoard, cardName);
	});

	socket.on('CARD_MOVED', ({ name, x, y, isBack, position, rotation }) =>
	{
		for (const card of cardsOnBoard)
		{
			if (card.name === name)
			{
				card.x        = x;
				card.y        = y;
				card.rotation = rotation;
				card.isBack   = isBack;
				card.position = cardsOnBoard.length;

				io.emit('CARD_' + name + '_MOVED', card);
			}
			else if (card.position > position)
			{
				card.position = card.position - 1;
			}
		}
		io.emit('CARD_GO_FRONT', { name, position });
	});
});

const hasBeenInit = function()
{
	return cardsOnBoard.length + cardsOnPick.length + cardsOnDiscard.length > 0;
};

const moveCardIntoStack = (from, to, cardName) =>
{
	// TODO: improve => change array to key/value array
	for (let key = 0; key < from.length; key ++)
	{
		if (cardName === from[key].name)
		{
			const card    = from[key];
			card.x        = 100;
			card.y        = 100;
			card.rotation = 0;
			card.isBack   = true;
			card.position = 1;
			to.push(card);
			from.splice(key, 1);

			const result = { cardsOnBoard: cardsOnBoard, cardsOnPick: cardsOnPick, cardsOnDiscard: cardsOnDiscard };
			io.emit('CARD_STACKS', result);
			return;
		}
	}
};
