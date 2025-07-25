import 'react-flexview/lib/flexView.css';

import React, {Component} from 'react';
import Flex from 'react-flexview';
import _ from 'lodash';
import Confetti from './Confetti.js';

import * as powerups from '../../lib/powerups';
import Player from '../Player';
import Toolbar from '../Toolbar';
import {toArr} from '../../lib/jsUtils';
import {toHex, darken, GREENISH} from '../../lib/colors';

const vimModeKey = 'vim-mode';
const vimModeRegex = /^\d+(a|d)*$/;

// component for gameplay -- incl. grid/clues & toolbar
export default class Game extends Component {
  constructor() {
    super();
    this.state = {
      listMode: false,
      pencilMode: false,
      hideAcrossMode: false,
      hideDownMode: false,
      autocheckMode: false,
      screenWidth: 0,
      vimMode: false,
      vimInsert: false,
      vimCommand: false,
      colorAttributionMode: false,
      expandMenu: false,
    };
  }

  componentDidMount() {
    const screenWidth = window.innerWidth - 1; // this is important for mobile to fit on screen
    let vimMode = false;
    try {
      vimMode = JSON.parse(localStorage.getItem(vimModeKey)) || false;
    } catch (e) {
      console.error('Failed to parse local storage vim mode!');
    }
    // with body { overflow: hidden }, it should disable swipe-to-scroll on iOS safari)
    this.setState({
      screenWidth,
      vimMode,
    });
    this.componentDidUpdate({});
  }

  componentDidUpdate(prevProps) {
    if (prevProps.myColor !== this.props.myColor) {
      this.handleUpdateColor(this.props.id, this.props.myColor);
    }
  }

  get rawGame() {
    return this.props.historyWrapper && this.props.historyWrapper.getSnapshot();
  }

  get rawOpponentGame() {
    return this.props.opponentHistoryWrapper && this.props.opponentHistoryWrapper.getSnapshot();
  }

  // TODO: this should be cached, sigh...
  get games() {
    return powerups.apply(
      this.rawGame,
      this.rawOpponentGame,
      this.props.ownPowerups,
      this.props.opponentPowerups
    );
  }

  get game() {
    return this.games.ownGame;
  }

  get opponentGame() {
    return this.games.opponentGame;
  }

  get gameModel() {
    return this.props.gameModel;
  }

  scope(s) {
    if (s === 'square') {
      return this.player.getSelectedSquares();
    }
    if (s === 'word') {
      return this.player.getSelectedAndHighlightedSquares();
    }
    if (s === 'puzzle') {
      return this.player.getAllSquares();
    }
    return [];
  }

  handleUpdateGrid = (r, c, value) => {
    const {id, myColor} = this.props;
    const {pencilMode} = this.state;
    const {autocheckMode} = this.state;
    this.gameModel.updateCell(r, c, id, myColor, pencilMode, value, autocheckMode);
    this.props.onChange({isEdit: true});
    this.props.battleModel && this.props.battleModel.checkPickups(r, c, this.rawGame, this.props.team);
  };

  handleUpdateCursor = ({r, c}) => {
    const {id} = this.props;
    if (this.game.solved && !_.find(this.game.cursors, (cursor) => cursor.id === id)) {
      return;
    }
    this.gameModel.updateCursor(r, c, id);
  };

  handleAddPing = ({r, c}) => {
    const {id} = this.props;
    this.gameModel.addPing(r, c, id);
  };

  handleUpdateColor = (id, color) => {
    this.gameModel.updateColor(id, color);
  };

  handleStartClock = () => {
    this.props.gameModel.updateClock('start');
  };

  handlePauseClock = () => {
    this.props.gameModel.updateClock('pause');
  };

  handleResetClock = () => {
    this.props.gameModel.updateClock('reset');
  };

  handleCheck = (scopeString) => {
    const scope = this.scope(scopeString);
    this.props.gameModel.check(scope);
  };

  handleReveal = (scopeString) => {
    const scope = this.scope(scopeString);
    this.props.gameModel.reveal(scope);
    this.props.onChange();
  };

  handleReset = (scopeString, force = false) => {
    const scope = this.scope(scopeString);
    this.props.gameModel.reset(scope, force);
  };

  handleKeybind = (mode) => {
    this.setState({
      vimMode: mode === 'vim',
    });
  };

  handleToggleVimMode = () => {
    this.setState((prevState) => {
      const newVimMode = !prevState.vimMode;
      localStorage.setItem(vimModeKey, JSON.stringify(newVimMode));
      return {vimMode: newVimMode};
    });
  };

  handleVimInsert = () => {
    this.setState({
      vimInsert: true,
    });
  };

  handleVimCommand = () => {
    this.setState((prevState) => ({
      vimCommand: !prevState.vimCommand,
    }));
  };

  handleVimNormal = () => {
    this.setState({
      vimInsert: false,
      vimCommand: false,
    });
  };

  handleTogglePencil = () => {
    this.setState((prevState) => ({
      pencilMode: !prevState.pencilMode,
    }));
  };

  handleToggleHideAcross = () => {
    this.setState((prevState) => ({
      hideAcrossMode: !prevState.hideAcrossMode,
    }));
  }

  handleToggleHideDown = () => {
    this.setState((prevState) => ({
      hideDownMode: !prevState.hideDownMode,
    }));
  }

  handleToggleAutocheck = () => {
    this.setState((prevState) => ({
      autocheckMode: !prevState.autocheckMode,
    }));
  };

  handleToggleListView = () => {
    this.setState((prevState) => ({
      listMode: !prevState.listMode,
    }));
  };

  handleToggleChat = () => {
    this.props.onToggleChat();
  };

  handleToggleExpandMenu = () => {
    this.setState((prevState) => ({
      expandMenu: !prevState.expandMenu,
    }));
  };

  handleRefocus = () => {
    this.focus();
  };

  handlePressPeriod = this.handleTogglePencil;

  handleVimCommandPressEnter = (command) => {
    if (vimModeRegex.test(command)) {
      let dir = 'across';
      const int = parseInt(command, 10);
      if (command.endsWith('d')) {
        dir = 'down';
      }
      this.player.selectClue(dir, int);
    }
    this.handleRefocus();
  };

  handlePressEnter = () => {
    this.props.onUnfocus();
  };

  focus() {
    this.player && this.player.focus();
  }

  handleSelectClue(direction, number) {
    this.player.selectClue(direction, number);
  }

  renderPlayer() {
    const {id, myColor, mobile, beta} = this.props;
    if (!this.game) {
      return <div>Loading...</div>;
    }

    const {
      grid,
      circles,
      shades,
      cursors,
      pings,
      users,
      solved,
      solution,
      themeColor,
      optimisticCounter,
    } = this.game;
    const clues = {
      ...this.game.clues,
    };
    if (window.location.host === 'foracross.com' || window.location.host.includes('.foracross.com')) {
      const dirToHide = window.location.host.includes('down') ? 'across' : 'down';
      clues[dirToHide] = _.assign([], clues[dirToHide]).map((val) => val && '-');
    }
    const opponentGrid = this.opponentGame && this.opponentGame.grid;
    const {screenWidth} = this.state;
    const themeStyles = {
      clueBarStyle: {
        backgroundColor: toHex(themeColor),
      },
      gridStyle: {
        cellStyle: {
          selected: {
            backgroundColor: myColor,
          },
          highlighted: {
            backgroundColor: toHex(darken(themeColor)),
          },
          frozen: {
            backgroundColor: toHex(GREENISH),
          },
        },
      },
    };
    const cols = grid[0].length;
    const rows = grid.length;
    const width = Math.min((35 * 15 * cols) / rows, screenWidth - 20);
    const minSize = this.props.mobile ? 1 : 20;
    const size = Math.max(minSize, width / cols);
    return (
      <Player
        ref={(c) => {
          this.player = c;
        }}
        beta={beta}
        size={size}
        grid={grid}
        solution={solution}
        opponentGrid={opponentGrid}
        circles={circles}
        shades={shades}
        clues={{
          across: toArr(clues.across),
          down: toArr(clues.down),
        }}
        id={id}
        cursors={cursors}
        pings={pings}
        users={users}
        frozen={solved}
        myColor={myColor}
        updateGrid={this.handleUpdateGrid}
        updateCursor={this.handleUpdateCursor}
        addPing={this.handleAddPing}
        onPressEnter={this.handlePressEnter}
        onPressPeriod={this.handlePressPeriod}
        listMode={this.state.listMode}
        hideAcrossMode={this.state.hideAcrossMode}
        hideDownMode={this.state.hideDownMode}
        vimMode={this.state.vimMode}
        vimInsert={this.state.vimInsert}
        vimCommand={this.state.vimCommand}
        onVimInsert={this.handleVimInsert}
        onVimNormal={this.handleVimNormal}
        onVimCommand={this.handleVimCommand}
        onVimCommandPressEnter={this.handleVimCommandPressEnter}
        onVimCommandPressEscape={this.handleRefocus}
        colorAttributionMode={this.state.colorAttributionMode}
        mobile={mobile}
        pickups={this.props.pickups}
        optimisticCounter={optimisticCounter}
        onCheck={this.handleCheck}
        onReveal={this.handleReveal}
        {...themeStyles}
      />
    );
  }

  renderToolbar() {
    if (!this.game) return;
    const {clock, solved} = this.game;
    const {mobile} = this.props;
    const {pencilMode, hideAcrossMode, hideDownMode, autocheckMode, vimMode, vimInsert, vimCommand, listMode, expandMenu} = this.state;
    const {lastUpdated: startTime, totalTime: pausedTime, paused: isPaused} = clock;
    return (
      <Toolbar
        v2
        gid={this.props.gid}
        pid={this.game.pid}
        mobile={mobile}
        startTime={startTime}
        pausedTime={pausedTime}
        isPaused={isPaused}
        listMode={listMode}
        expandMenu={expandMenu}
        pencilMode={pencilMode}
        hideAcrossMode={hideAcrossMode}
        hideDownMode={hideDownMode}
        autocheckMode={autocheckMode}
        vimMode={vimMode}
        solved={solved}
        vimInsert={vimInsert}
        vimCommand={vimCommand}
        onStartClock={this.handleStartClock}
        onPauseClock={this.handlePauseClock}
        onResetClock={this.handleResetClock}
        onCheck={this.handleCheck}
        onReveal={this.handleReveal}
        onReset={this.handleReset}
        onKeybind={this.handleKeybind}
        onTogglePencil={this.handleTogglePencil}
        onToggleHideAcross={this.handleToggleHideAcross}
        onToggleHideDown={this.handleToggleHideDown}
        onToggleVimMode={this.handleToggleVimMode}
        onToggleAutocheck={this.handleToggleAutocheck}
        onToggleListView={this.handleToggleListView}
        onToggleChat={this.handleToggleChat}
        onToggleExpandMenu={this.handleToggleExpandMenu}
        colorAttributionMode={this.state.colorAttributionMode}
        onToggleColorAttributionMode={() => {
          this.setState((prevState) => ({colorAttributionMode: !prevState.colorAttributionMode}));
        }}
        onRefocus={this.handleRefocus}
        unreads={this.props.unreads}
      />
    );
  }

  render() {
    const padding = this.props.mobile ? 0 : 20;
    return (
      <Flex column grow={1}>
        {this.renderToolbar()}
        <Flex
          grow={1}
          style={{
            padding,
          }}
        >
          {this.renderPlayer()}
        </Flex>
        {this.game.solved && <Confetti />}
      </Flex>
    );
  }
}
