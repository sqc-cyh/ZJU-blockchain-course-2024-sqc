import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import HomePage from './pages/home/home'; // 导入你的新页面
import './App.css';

const App: React.FC = () => {
    return (
        <div className="App">
          <HomePage/>
        </div>
      );
};

export default App;