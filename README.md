# 📦 3D Container Loading Optimization Website

## 🚀 Overview
This project is a web-based application that solves the **3D Container Loading Problem (CLP)** using advanced search and optimization algorithms. The goal is to efficiently pack boxes of different sizes into a container while maximizing space utilization and avoiding overlaps.

The system implements:
- **Greedy Algorithm**
- **Genetic Algorithm (GA)**
- **Simulated Annealing (SA)**

---

## 🎯 Problem Description
Given:
- A container with fixed dimensions (**length, width, height**)
- A set of boxes with varying sizes

Objective:
- Maximize space utilization
- Fit as many boxes as possible
- Ensure **no overlap**
- Respect container boundaries

---

## 🧠 Algorithms

### 🔹 Greedy Algorithm
A heuristic approach that places boxes sequentially:
- Sorts boxes (e.g., by volume or height)
- Places each box in the first available position it fits

**Advantages:**
- Very fast
- Easy to implement

**Disadvantages:**
- Can lead to suboptimal solutions

---

### 🧬 Genetic Algorithm (GA)
An evolutionary algorithm inspired by natural selection:
- Each solution is represented as a **chromosome**
- Uses:
  - **Selection**
  - **Crossover**
  - **Mutation**
- Improves solutions over generations

**Advantages:**
- Produces high-quality solutions
- Explores a large search space

**Disadvantages:**
- Computationally expensive
- Requires parameter tuning

---

### 🌡️ Simulated Annealing (SA)
A probabilistic optimization technique:
- Starts with an initial solution
- Explores neighboring solutions
- Accepts worse solutions early to escape local optima
- Gradually reduces randomness

**Advantages:**
- Avoids local minima
- Flexible and effective

**Disadvantages:**
- Slower than greedy
- Sensitive to cooling schedule

---

## 🌐 Features
- 📦 3D visualization of container and box placement
- ⚙️ Multiple algorithm selection (Greedy, GA, SA)
- 📊 Performance comparison
- 🔄 Real-time simulation
- 🧾 Custom input for container and box dimensions
