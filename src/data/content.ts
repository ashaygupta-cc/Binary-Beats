// Structured content data exported as Svelte/TS constants

export interface Arc {
  id: number;
  title: string;
  description: string;
  accColor: string;
  bgColor: string;
  asciiArt?: string;
  domain: string;
  arcName: string;
  progressWidth?: string;
  sequence?: number;
}

export interface Episode {
  id: string;
  arcId: number;
  n: number;
  title: string;
  description: string;
  type: 'research' | 'quiz' | 'ctf' | 'exploit';
  min: number;
  xp: number;
  done: boolean;
  active?: boolean;
  art?: string;
  bg?: string;
}

export const ARCS: Arc[] = [
  {
    "id": 1,
    "title": "The Eclipse",
    "description": "GOLDEN AGE ARC",
    "accColor": "#e8000d",
    "bgColor": "#0d0003",
    "asciiArt": "\u2572\u2572\u2572  \u2588\u2588\u2588\u2588  \u2571\u2571\u2571\n   \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\n    \u2588\u2588  \u2588\u2588\n  \u25c6 \u2588\u2588\u2500\u2500\u2588\u2588 \u25c6\n \u2550\u2550\u256c\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u256c\u2550\u2550\n    \u2559\u2550\u2550\u255c\n \u2500 G U T S \u2500\n DRAGONSLAYER",
    "domain": "ALGORITHMS",
    "arcName": "GOLDEN AGE ARC",
    "progressWidth": "70%"
  },
  {
    "id": 2,
    "title": "Grand Line",
    "description": "MARINEFORD ARC",
    "accColor": "#1a7fd4",
    "bgColor": "#00101a",
    "asciiArt": "  .\u2500\u2500\u2500\u2500\u2500\u2500.\n / \u25ce    \u25ce\\\n\u2502    \u25bd    \u2502\n\u2502 \u2500\u2500\u2500\u2500\u2500\u2500\u2500 \u2502\n \\       /\n  `\u2500\u2500\u252c\u2500\u2500'\n \u2693\u2500\u2500\u2502\u2500\u2500\u2693\n GOMU_GOMU\n ENIES_LOBBY",
    "domain": "CYBERSECURITY",
    "arcName": "MARINEFORD ARC",
    "progressWidth": "25%"
  },
  {
    "id": 3,
    "title": "JOHANS LAB",
    "description": "MONSTER W/O NAME ARC",
    "accColor": "#00c85a",
    "bgColor": "#000d05",
    "asciiArt": "\u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n\u2502  \u2500\u2500\u2500 \u2500\u2500\u2500 \u2502\n\u2502     \u1d55     \u2502\n\u2502  \u2500\u2500\u2500\u2500\u2500    \u2502\n\u2502           \u2502\n\u2502KINDERHEIM \u2502\n\u2502  511 511  \u2502\n\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518\n M O N S T E R\n  DR.TENMA",
    "domain": "MACHINE LEARNING",
    "arcName": "MONSTER W/O NAME ARC",
    "progressWidth": "40%"
  },
  {
    "id": 4,
    "title": "The Knot",
    "description": "1953 CYCLE ARC",
    "accColor": "#d4810a",
    "bgColor": "#0d0800",
    "asciiArt": "1953 \u2500\u2500\u25ba 1986\n  \u25b2    \u25c7    \u2502\n  \u2502         \u25bc\n2052 \u25c4\u2500\u2500 2019\n\u2500\u2500\u2500 WINDEN \u2500\u2500\u2500\n T\u00b7H\u00b7E\u00b7K\u00b7N\u00b7O\u00b7T\n  ADAM / EVA\n TIME_KNOTEN",
    "domain": "NETWORKS",
    "arcName": "1953 CYCLE ARC",
    "progressWidth": "55%"
  },
  {
    "id": 5,
    "title": "Prophecy",
    "description": "THE FRIEND ARC",
    "accColor": "#9b5fff",
    "bgColor": "#080010",
    "asciiArt": "\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557\n\u2551 \u2605     \u2605 \u2551\n\u2551         \u2551\n\u2551  \u2500\u2500\u2500\u2500\u2500  \u2551\n\u2551 \u2571     \u2572 \u2551\n\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d\n\u3068\u3082\u3060\u3061\nF\u00b7R\u00b7I\u00b7E\u00b7N\u00b7D\nEXPO_ARC",
    "domain": "DATA STRUCTURES",
    "arcName": "THE FRIEND ARC",
    "progressWidth": "15%"
  },
  {
    "id": 6,
    "title": "ONE PUNCH",
    "description": "MONSTER ASSOC ARC",
    "accColor": "#f9a825",
    "bgColor": "#0d0d00",
    "asciiArt": "\u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n\u2502 \u25cb      \u25cb \u2502\n\u2502    \u2500     \u2502\n\u2502          \u2502\n\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518\n\u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n\u2502   O K    \u2502\n\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518\n S\u00b7A\u00b7I\u00b7T\u00b7A\u00b7M\u00b7A\nGAROU_ARC",
    "domain": "COMP. PROG",
    "arcName": "MONSTER ASSOC ARC",
    "progressWidth": "0%"
  },
  {
    "id": 7,
    "title": "UNIT-01",
    "description": "INSTRUMENTALITY ARC",
    "accColor": "#4fc3f7",
    "bgColor": "#00060d",
    "asciiArt": "  \u2571\u25b2\u2572\n \u2571 \u25b3 \u2572\n\u2571\u2500\u2500\u2500\u2500\u2500\u2572\n\u2502 \u03a3 \u03a0 \u2502\n\u2502 \u222b \u03bb \u2502\n\u2502MATRIX\u2502\n\u2572\u2500\u2500\u2500\u2500\u2500\u2571\nEVA\u00b7UNIT\n NERV_HQ",
    "domain": "MATHEMATICS",
    "arcName": "INSTRUMENTALITY ARC",
    "progressWidth": "0%"
  },
  {
    "id": 8,
    "title": "LAB\u00b7MEM",
    "description": "DIVERGENCE ARC",
    "accColor": "#ff7043",
    "bgColor": "#0d0400",
    "asciiArt": "\u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n\u2502 0.337%  \u2502\n\u2502DIVERGE  \u2502\n\u251c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524\n\u2502 OKABE   \u2502\n\u2502 KURISU  \u2502\n\u2502 MAYURI  \u2502\n\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518\nEL_PSY_CON\n GROO_ARC",
    "domain": "PROBABILITY",
    "arcName": "DIVERGENCE ARC",
    "progressWidth": "0%"
  },
  {
    "id": 9,
    "title": "Initiation",
    "description": "ACADEMY BOOTCAMP",
    "accColor": "var(--lime)",
    "bgColor": "#000502",
    "asciiArt": "\u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n\u2502 I N I T  \u2502\n\u2502  0 1 0 1 \u2502\n\u2502 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 \u2502\n\u2502  B O O T \u2502\n\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518\n SYSTEM_NEW\n FRESHMAN_OP",
    "domain": "PROGRAMMING BASICS",
    "arcName": "ACADEMY BOOTCAMP",
    "progressWidth": "100%"
  }
];

export const EPISODES: Episode[] = [
  {
    "id": "S1E1_A1",
    "arcId": 1,
    "n": 1,
    "title": "Band of the Hawk \u2014 Graph Theory",
    "description": "Guts commanded a mercenary unit that conquered fortresses through optimal troop routing. Model their battlefield logistics as a weighted directed graph. Implement Kruskal's and Prim's algorithms to find the minimum spanning tree that connects every stronghold in Midland with the least resource cost. Analyze edge cases where Griffith's ambition creates negative-weight cycles.",
    "type": "research",
    "min": 20,
    "xp": 80,
    "done": true,
    "art": " \u2571\u25b2\u2572\n\u25b2   \u25b2\n  \u25b2  ",
    "bg": "#0d0003"
  },
  {
    "id": "S1E2_A1",
    "arcId": 1,
    "n": 2,
    "title": "The Eclipse \u2014 NP-Completeness",
    "description": "During the Eclipse, the God Hand forced Griffith into the ultimate decision problem \u2014 sacrifice everything or remain broken. Explore the computational theory behind NP-complete problems: reduction proofs, the Cook-Levin theorem, and why P \u2260 NP remains the holy grail of computer science. Prove that the 'Optimal Sacrifice Selection' is reducible from 3-SAT.",
    "type": "quiz",
    "min": 35,
    "xp": 140,
    "done": false,
    "art": "\u2588\u2588\u2588\u2588\u2588\u2588\n\u2588\u2588  \u2588\u2588\n\u2588\u2588\u2588\u2588\u2588\u2588",
    "bg": "#0a0005"
  },
  {
    "id": "S1E3_A1",
    "arcId": 1,
    "n": 3,
    "title": "Berserker Armor \u2014 Greedy vs Dynamic",
    "description": "The Berserker Armor amplifies Guts' power but at a devastating cost \u2014 it greedily optimizes for immediate combat output while ignoring long-term health. Compare greedy algorithms (locally optimal choices) against dynamic programming (globally optimal substructure). Implement both approaches for the Knapsack Problem and prove when greedy fails catastrophically.",
    "type": "ctf",
    "min": 40,
    "xp": 200,
    "done": false,
    "active": true,
    "art": "\u2694 BRSRK\n\u2550\u2550\u2550\u2550\u2550\u2550\nGREEDY",
    "bg": "#1a0008"
  },
  {
    "id": "S1E4_A1",
    "arcId": 1,
    "n": 4,
    "title": "Falcon of Light \u2014 Dijkstra's Shortest Path",
    "description": "Griffith's rebirth as Femto gave him omniscient awareness of every path through the astral plane. Implement Dijkstra's shortest path algorithm to navigate Griffith's astral network. Handle the edge case of Bellman-Ford when encountering negative-weight edges created by apostle transformations. Benchmark both algorithms on sparse vs dense graphs.",
    "type": "quiz",
    "min": 30,
    "xp": 160,
    "done": false,
    "art": "FALCON\n  \u2572\u2571\n LIGHT",
    "bg": "#0d0003"
  },
  {
    "id": "S1E1_A2",
    "arcId": 2,
    "n": 1,
    "title": "Entering the Grand Line \u2014 Firewalls & NAT",
    "description": "The Red Line is the ultimate firewall separating the four Blues. Study network address translation (NAT), packet filtering rules, and stateful inspection firewalls. Configure iptables rules that would protect a marine base from pirate reconnaissance scans. Understand the difference between DMZ architecture and reverse proxy isolation as used by Vegapunk's lab network.",
    "type": "research",
    "min": 25,
    "xp": 90,
    "done": true,
    "art": "\u2693 \u2693 \u2693\n RED  \n LINE ",
    "bg": "#00101a"
  },
  {
    "id": "S1E2_A2",
    "arcId": 2,
    "n": 2,
    "title": "Enies Lobby \u2014 Buffer Overflow Exploitation",
    "description": "The Straw Hats broke into the World Government's most secure judicial fortress. Analyze how buffer overflow vulnerabilities work at the assembly level: stack smashing, return address overwriting, NOP sleds, and shellcode injection. Recreate the classic ret2libc attack against a vulnerable C binary. Understand ASLR and stack canaries as modern defenses Cipher Pol failed to deploy.",
    "type": "ctf",
    "min": 45,
    "xp": 220,
    "done": false,
    "art": "BUFFER\nOVERFL\n  OW  ",
    "bg": "#002030"
  },
  {
    "id": "S1E3_A2",
    "arcId": 2,
    "n": 3,
    "title": "Marineford \u2014 DDoS & Incident Response",
    "description": "The Battle of Marineford was history's largest coordinated assault \u2014 a DDoS attack from every pirate crew simultaneously. Build an incident response playbook: detect SYN floods using netflow analysis, implement rate limiting with token bucket algorithms, deploy Anycast DNS for traffic distribution, and write Snort/Suricata rules to identify Whitebeard's seismic packet signatures.",
    "type": "quiz",
    "min": 35,
    "xp": 160,
    "done": false,
    "art": "  \u25ce  \n  \u25bc  \nPORT3010",
    "bg": "#002030"
  },
  {
    "id": "S1E4_A2",
    "arcId": 2,
    "n": 4,
    "title": "Poneglyph Cipher \u2014 RSA & Public Key Crypto",
    "description": "The Poneglyphs contain the world's most dangerous encrypted history, readable only by those who possess the ancient key. Implement RSA encryption from scratch: generate large primes with Miller-Rabin, compute modular exponentiation with square-and-multiply, and understand why factoring the semiprime n = p \u00d7 q is computationally intractable. Decrypt Robin's intercepted Poneglyph transmission.",
    "type": "ctf",
    "min": 50,
    "xp": 280,
    "done": false,
    "art": "\u2554\u2550RSA\u2550\u2557\n\u2551P \u00d7 Q\u2551\n\u255a\u2550\u2550\u2550\u2550\u2550\u255d",
    "bg": "#001525"
  },
  {
    "id": "S1E1",
    "arcId": 3,
    "n": 1,
    "title": "Mommy, what is a neuron?",
    "description": "In Kinderheim 511, children were shaped into weapons through conditioning \u2014 a dark mirror of how artificial neurons are trained through weighted inputs. Build the McCulloch-Pitts neuron from scratch: implement the step activation function, compute the weighted sum, and understand the geometric interpretation of a single perceptron as a hyperplane decision boundary in n-dimensional space.",
    "type": "quiz",
    "min": 25,
    "xp": 100,
    "done": true,
    "art": "\u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n\u2502 \u25cb   \u25cb \u2502\n\u2502   \u2500   \u2502\n\u2502NEURON \u2502\n\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518",
    "bg": "#000d05"
  },
  {
    "id": "S1E2",
    "arcId": 3,
    "n": 2,
    "title": "Mommy, why do we need layers?",
    "description": "Johan could manipulate anyone \u2014 but one person was never enough. True power required networks of influence, layers of manipulation. Prove mathematically why a single-layer perceptron cannot learn XOR. Then build a 2-layer MLP that can, using sigmoid activations and manual weight initialization. Visualize the decision boundary transformation at each hidden layer to understand how depth creates non-linear feature maps.",
    "type": "research",
    "min": 35,
    "xp": 140,
    "done": true,
    "art": "\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2557\n\u2551LAYER1\u2551\n\u2551  \u2502   \u2551\n\u2551LAYER2\u2551\n\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u255d",
    "bg": "#050010"
  },
  {
    "id": "S1E3",
    "arcId": 3,
    "n": 3,
    "title": "Mommy, what is backpropagation?",
    "description": "Dr. Tenma's guilt propagated backward through every decision he ever made \u2014 each choice's consequence flowing back to reshape his understanding. Derive the backpropagation algorithm from first principles using the multivariate chain rule. Implement it in pure NumPy for a 3-layer network. Diagnose vanishing gradients in sigmoid networks and prove why ReLU's constant gradient solves the problem.",
    "type": "ctf",
    "min": 45,
    "xp": 200,
    "done": true,
    "art": "\u26d3 \u26d3 \u26d3\nCHAIN\nRULE\n\u26d3 \u26d3 \u26d3",
    "bg": "#0a0005"
  },
  {
    "id": "S2E1",
    "arcId": 3,
    "n": 1,
    "title": "Mommy, what is attention?",
    "description": "Inspector Lunge maintained mental filing cabinets \u2014 attending to specific memories while ignoring noise. This is exactly how attention mechanisms work. Implement scaled dot-product attention: Q\u00d7K^T/\u221ad_k \u2192 softmax \u2192 \u00d7V. Build intuition for why scaling prevents gradient saturation, and demonstrate how attention weights create interpretable alignment maps between sequence elements.",
    "type": "research",
    "min": 40,
    "xp": 170,
    "done": true,
    "art": "Q\u00b7K\u00b7V\n \u2500\u2500\u2500 \n ATTN\n \u2500\u2500\u2500 ",
    "bg": "#000d05"
  },
  {
    "id": "S2E2",
    "arcId": 3,
    "n": 2,
    "title": "Mommy, what is a Transformer?",
    "description": "Johan Liebert was the perfect architecture \u2014 self-contained, parallelizable, infinitely scalable in his influence. Assemble the complete Transformer encoder: multi-head self-attention (splitting Q,K,V across h heads), layer normalization, resitransmissions connections, and position-wise feed-forward networks. Implement sinusoidal positional encoding and explain why learned embeddings sometimes outperform it.",
    "type": "quiz",
    "min": 45,
    "xp": 200,
    "done": true,
    "art": "\u26a1\u26a1\u26a1\nTRANS\nFORMER\n\u26a1\u26a1\u26a1",
    "bg": "#050010"
  },
  {
    "id": "S2E3",
    "arcId": 3,
    "n": 3,
    "title": "Ruhenheim \u2014 Vision Transformers & the Death of CNNs",
    "description": "In Ruhenheim, Johan orchestrated the end of an era \u2014 everyone turned on each other, and the old order collapsed. The Vision Transformer (ViT) did the same to computer vision. Implement patch embedding (splitting 224\u00d7224 images into 16\u00d716 patches), prepend the [CLS] token, apply Transformer encoding, and benchmark against ResNet-50. Prove that ViTs need more data but scale better.",
    "type": "ctf",
    "min": 50,
    "xp": 280,
    "done": false,
    "active": true,
    "art": "\u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n\u2502RUHEN \u2502\n\u2502 HEIM \u2502\n\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2518",
    "bg": "#000d05"
  },
  {
    "id": "S1E1_A4",
    "arcId": 4,
    "n": 1,
    "title": "Everything is Connected \u2014 Network Topologies",
    "description": "In Winden, every person is connected across three timelines \u2014 a mesh network of causal relationships. Study network topologies (star, ring, mesh, tree) and implement graph traversal algorithms (BFS/DFS) to map the Winden family connections. Calculate clustering coefficients and identify bridge nodes whose removal would collapse the temporal graph.",
    "type": "research",
    "min": 25,
    "xp": 90,
    "done": false,
    "art": " \u25ef \u2500\u2500 \u25ef \n \u2502 \u2572  \u2502 \n \u25ef \u2500\u2500 \u25ef ",
    "bg": "#0d0800"
  },
  {
    "id": "S1E2_A4",
    "arcId": 4,
    "n": 2,
    "title": "The Bootstrap Paradox \u2014 TCP/IP Handshake",
    "description": "The bootstrap paradox in Dark mirrors the TCP three-way handshake: SYN \u2192 SYN-ACK \u2192 ACK, a circular dependency where no message can be the 'first'. Implement a TCP state machine, analyze sequence number prediction attacks, and understand why Lamport timestamps fail in relativistic networks where time itself is unreliable.",
    "type": "quiz",
    "min": 30,
    "xp": 120,
    "done": false,
    "art": "SYN \u2500\u2500\u25ba\n\u25c4\u2500\u2500 ACK\n\u2500\u2500\u25ba FIN",
    "bg": "#1a1000"
  },
  {
    "id": "S1E3_A4",
    "arcId": 4,
    "n": 3,
    "title": "Adam & Eva \u2014 Consensus in Distributed Systems",
    "description": "Adam and Eva each maintained their own version of reality \u2014 a distributed system with no single source of truth. Implement the Raft consensus algorithm: leader election, log replication, and safety guarantees. Explore the CAP theorem and prove that in the presence of network partitions (like the Winden caves), you must choose between consistency and availability.",
    "type": "ctf",
    "min": 45,
    "xp": 220,
    "done": false,
    "art": "RAFT\n\u25c7 \u25c7 \u25c7\nVOTE!",
    "bg": "#0d0800"
  },
  {
    "id": "S1E1_A5",
    "arcId": 5,
    "n": 1,
    "title": "The Book of Prophecy \u2014 Hash Maps & Tries",
    "description": "The Friend's Book of Prophecy predicted events by their symbolic fingerprints \u2014 a perfect hash function mapping future events to memory addresses. Implement a hash table from scratch with chaining collision resolution. Then build a prefix trie to autocomplete the Friend's prophecy keywords. Analyze amortized O(1) lookup vs O(n) worst-case when hash functions degenerate.",
    "type": "research",
    "min": 25,
    "xp": 100,
    "done": false,
    "art": " \u26a1 \u2605 \u26a1 \n  \u2500\u2500\u2500  ",
    "bg": "#080010"
  },
  {
    "id": "S1E2_A5",
    "arcId": 5,
    "n": 2,
    "title": "Expo 1970 \u2014 Priority Queues & Heaps",
    "description": "The 1970 Osaka Expo was the nexus where the Friend's plan crystallized \u2014 events were prioritized by their prophetic importance. Build a binary min-heap from scratch, implement heapify, extract-min, and decrease-key. Use it to build a priority queue that schedules Kenji's resistance missions by urgency. Prove the O(log n) guarantee and compare against Fibonacci heaps.",
    "type": "quiz",
    "min": 30,
    "xp": 120,
    "done": false,
    "art": "HEAP\n\u2571  \u2572\n\u25ef    \u25ef",
    "bg": "#0a0018"
  },
  {
    "id": "S1E3_A5",
    "arcId": 5,
    "n": 3,
    "title": "The Friend's Identity \u2014 Binary Search Trees",
    "description": "Kenji spent decades narrowing down the Friend's true identity from thousands of suspects \u2014 a binary search through possibility space. Implement a self-balancing AVL tree with rotations (LL, RR, LR, RL). Insert all suspects, then perform range queries to find candidates matching specific criteria. Prove the O(log n) height guarantee and demonstrate how unbalanced BSTs degrade to O(n).",
    "type": "ctf",
    "min": 40,
    "xp": 200,
    "done": false,
    "art": "  \u25ef  \n \u2571 \u2572 \n\u25ef   \u25ef",
    "bg": "#100020"
  },
  {
    "id": "S1E1_A6",
    "arcId": 6,
    "n": 1,
    "title": "O(1) \u2014 Saitama's Constant Time",
    "description": "Saitama solves every fight in O(1) \u2014 one punch. But real competitive programming demands you understand why constant time is the theoretical floor. Implement bit manipulation tricks: counting set bits (popcount), finding the lowest set bit, XOR-based duplicate detection, and power-of-two checks. Master the art of replacing O(n) loops with O(1) bit operations that would make even Saitama proud.",
    "type": "research",
    "min": 18,
    "xp": 70,
    "done": false,
    "art": "\u250c\u2500\u2500\u2500\u2510\n\u2502O(1)\u2502\n\u2514\u2500\u2500\u2500\u2518",
    "bg": "#0d0d00"
  },
  {
    "id": "S1E2_A6",
    "arcId": 6,
    "n": 2,
    "title": "Garou's Martial Evolution \u2014 Adaptive Algorithms",
    "description": "Garou evolves mid-fight, adapting his martial arts style to counter every opponent. Design algorithms that adapt at runtime: implement both quicksort (average O(n log n) but O(n\u00b2) worst case) and introsort (which detects bad partitions and switches to heapsort). Build a benchmark harness that generates adversarial inputs targeting quicksort's worst case, then prove introsort remains O(n log n) guaranteed.",
    "type": "quiz",
    "min": 30,
    "xp": 130,
    "done": false,
    "art": " \u25e2\u25e3 \n\u25e5\u25e4",
    "bg": "#1a1a00"
  },
  {
    "id": "S1E3_A6",
    "arcId": 6,
    "n": 3,
    "title": "Serious blitz \u2014 Sliding Window & Two Pointers",
    "description": "When Saitama gets serious, every punch carries maximum efficiency \u2014 zero wasted motion. Master the sliding window technique: implement maximum subarray sum (Kadane's), longest substring without repeating characters, and minimum window substring. Then solve the classic two-pointer problem of container with most water. Each solution must run in O(n) time \u2014 anything slower is unworthy of the Serious blitz.",
    "type": "ctf",
    "min": 40,
    "xp": 220,
    "done": false,
    "art": "SERIOUS\nblitz\n\u2500\u2500\u2500\u2500\u2500",
    "bg": "#0d0d00"
  },
  {
    "id": "S1E1_A7",
    "arcId": 7,
    "n": 1,
    "title": "The AT-Field \u2014 Linear Algebra Foundations",
    "description": "The AT-Field is the barrier of the soul \u2014 a matrix transformation that separates one consciousness from another. Master the foundations: vector spaces, linear independence, span, basis, and dimension. Implement matrix multiplication from scratch, compute determinants via cofactor expansion, and prove that a matrix is invertible iff its determinant is non-zero. The AT-Field cannot be breached by singular transformations.",
    "type": "research",
    "min": 35,
    "xp": 150,
    "done": false,
    "art": " [x, y]\n + [z, w]",
    "bg": "#00060d"
  },
  {
    "id": "S1E2_A7",
    "arcId": 7,
    "n": 2,
    "title": "Instrumentality \u2014 Eigendecomposition & SVD",
    "description": "The Human Instrumentality Project merges all souls into a single primordial soup \u2014 the ultimate dimensionality reduction. Compute eigenvalues and eigenvectors of the NERV correlation matrix. Implement Singular Value Decomposition (SVD) to decompose the pilot synchronization data. Use the truncated SVD to compress the Eva-pilot neural interface signal while preserving 95% variance.",
    "type": "quiz",
    "min": 45,
    "xp": 220,
    "done": false,
    "art": "\u03bb\u2081 \u03bb\u2082 \u03bb\u2083\nEIGEN\nVALUES",
    "bg": "#001020"
  },
  {
    "id": "S1E3_A7",
    "arcId": 7,
    "n": 3,
    "title": "Third Impact \u2014 Gradient Descent on Non-Convex Surfaces",
    "description": "Third Impact represents the catastrophic convergence to a global minimum that destroys all local structure. Implement gradient descent with momentum, RMSProp, and Adam optimizer. Visualize the loss landscape of a non-convex function (Rastrigin, Rosenbrock) and demonstrate how learning rate schedules and warm restarts help escape saddle points that would trap vanilla SGD in local minima forever.",
    "type": "ctf",
    "min": 50,
    "xp": 280,
    "done": false,
    "art": " \u27c1 \u27c1 \u27c1 \n  IMPACT ",
    "bg": "#001020"
  },
  {
    "id": "S1E1_A8",
    "arcId": 8,
    "n": 1,
    "title": "Phone Wave Divergence \u2014 Bayesian Probability",
    "description": "Okabe's Phone Microwave sends messages across worldlines, but each D-mail shifts the divergence meter \u2014 a posterior probability update. Implement Bayes' theorem from scratch: compute prior, likelihood, and posterior distributions for worldline selection. Build a naive Bayes classifier that predicts which worldline a given set of observations belongs to. Understand why the 1% divergence barrier is a decision boundary.",
    "type": "research",
    "min": 30,
    "xp": 110,
    "done": false,
    "art": "0.337187\n %%% ",
    "bg": "#0d0400"
  },
  {
    "id": "S1E2_A8",
    "arcId": 8,
    "n": 2,
    "title": "Reading Steiner \u2014 Markov Chains & Stochastic Processes",
    "description": "Okabe's Reading Steiner ability lets him retain memories across worldline shifts \u2014 he is the only stationary distribution in a Markov chain of realities. Build a Markov chain transition matrix from Okabe's worldline jump logs. Compute the stationary distribution, prove ergodicity conditions, and simulate the chain to predict convergence time. Model Mayuri's death as an absorbing state and calculate first-passage time.",
    "type": "quiz",
    "min": 40,
    "xp": 180,
    "done": false,
    "art": "MARKOV\nCHAINS\n\u2501\u2501\u2501\u2501\u2501",
    "bg": "#1a0800"
  },
  {
    "id": "S1E3_A8",
    "arcId": 8,
    "n": 3,
    "title": "El Psy Kongroo \u2014 Monte Carlo & Convergence",
    "description": "To reach Steins;Gate \u2014 the one worldline where everyone survives \u2014 Okabe must search through 10^24 possibilities. Implement Monte Carlo estimation: approximate \u03c0 using random sampling, estimate integrals with importance sampling, and build a Metropolis-Hastings MCMC sampler. Prove the law of large numbers guarantees convergence, and compute confidence intervals for the divergence meter reading.",
    "type": "ctf",
    "min": 50,
    "xp": 260,
    "done": false,
    "art": "STEINS\n GATE\n 1.048596",
    "bg": "#0d0400"
  },
  {
    "id": "S1E5_A1",
    "arcId": 1,
    "n": 5,
    "title": "Skull Knight Path - A* Search",
    "description": "Skull Knight traverses the astral realm. Implement A* search with an admissible heuristic. Prove A* is optimally efficient using f-value monotonicity. Compare Dijkstra and BFS on benchmark maps.",
    "type": "ctf",
    "min": 38,
    "xp": 190,
    "done": false,
    "art": "A* GOAL",
    "bg": "#0d0003"
  },
  {
    "id": "S2E1_A1",
    "arcId": 1,
    "n": 6,
    "title": "Conviction Arc - Divide and Conquer",
    "description": "The Inquisition divided the resistance systematically. Master divide-and-conquer: implement merge sort, FFT, Karatsuba multiplication. Derive recurrences and solve with the Master Theorem.",
    "type": "research",
    "min": 32,
    "xp": 145,
    "done": false,
    "art": "DIV&CNQ",
    "bg": "#0d0003"
  },
  {
    "id": "S1E5_A2",
    "arcId": 2,
    "n": 5,
    "title": "Void Century - Steganography and OSINT",
    "description": "The World Government erased 800 years of history. Extract EXIF metadata, perform LSB steganography from PNGs, chain findings. Recover the hidden Poneglyph message from intercepted Marine transmissions.",
    "type": "ctf",
    "min": 55,
    "xp": 320,
    "done": false,
    "art": "STEG",
    "bg": "#002030"
  },
  {
    "id": "S1E4_A4",
    "arcId": 4,
    "n": 4,
    "title": "Triquetra - BGP and Internet Routing",
    "description": "The three Winden time periods mirror BGP routing. Study BGP path selection: AS path length, LOCAL_PREF, MED attributes. Simulate a BGP hijacking attack that captures all traffic destined for another era.",
    "type": "quiz",
    "min": 38,
    "xp": 170,
    "done": false,
    "art": "BGP AS",
    "bg": "#0d0800"
  },
  {
    "id": "S1E4_A5",
    "arcId": 5,
    "n": 4,
    "title": "20th Century Boys - Segment Trees",
    "description": "Kenji needed to query records across arbitrary time ranges. Build a segment tree for range-sum and range-min in O(log n). Add lazy propagation and persistent versions preserving all historical states.",
    "type": "ctf",
    "min": 45,
    "xp": 240,
    "done": false,
    "art": "SGTREE",
    "bg": "#080010"
  },
  {
    "id": "S1E4_A6",
    "arcId": 6,
    "n": 4,
    "title": "King vs Garou - Minimax",
    "description": "When King faced Garou, the illusion of power was itself a strategy. Implement minimax with alpha-beta pruning for two-player zero-sum games. Apply to combat scenarios where Saitama finds the guaranteed winning strategy.",
    "type": "research",
    "min": 36,
    "xp": 165,
    "done": false,
    "art": "MINMAX",
    "bg": "#0d0d00"
  },
  {
    "id": "S1E4_A7",
    "arcId": 7,
    "n": 4,
    "title": "Rei and Asuka - Lagrangian transmissionsity",
    "description": "Rei represents the primal, constrained by form. Asuka represents the transmissions, seeing the problem from another angle. Study Lagrangian transmissionsity in convex optimization and apply KKT conditions to SVM derivation.",
    "type": "quiz",
    "min": 50,
    "xp": 240,
    "done": false,
    "art": "PRIMAL",
    "bg": "#00060d"
  },
  {
    "id": "S1E4_A8",
    "arcId": 8,
    "n": 4,
    "title": "Divergence Meter - Hypothesis Testing",
    "description": "The divergence meter reads 1.048596%. Is this statistically significant? Implement t-tests, chi-square, ANOVA, and bootstrap resampling. Apply Bonferroni correction for multiple comparisons across 100+ worldlines.",
    "type": "research",
    "min": 35,
    "xp": 150,
    "done": false,
    "art": "p<0.05",
    "bg": "#0d0400"
  },
  {
    "id": "S1E1_A9",
    "arcId": 9,
    "n": 1,
    "title": "First Steps \u2014 Variables, Loops & Output",
    "description": "Every program is a list of instructions for a computer. In this episode you will write your first real programs. You will learn what a variable is (a named storage box for a value), how a loop repeats instructions automatically, and how a conditional makes decisions. By the end you will solve three classic beginner problems using nothing but these three tools.",
    "type": "ctf",
    "min": 20,
    "xp": 80,
    "done": false,
    "active": true,
    "art": "\u25c9 VARS\n\u2550\u2550\u2550\u2550\u2550\u2550\nLOOPS",
    "bg": "#000a02"
  },
  {
    "id": "S1E2_A9",
    "arcId": 9,
    "n": 2,
    "title": "Text & Characters \u2014 Working with Strings",
    "description": "Text is everywhere in programming. A string is simply a sequence of characters \u2014 letters, digits, spaces \u2014 stored one after another. This episode teaches you how to read indivitransmissions characters by their position (index), how to loop over every character in a word, and how to count, compare, and rearrange text. Every language feature you need is built-in.",
    "type": "ctf",
    "min": 20,
    "xp": 80,
    "done": false,
    "art": "\u25c9 STR\n\u2550\u2550\u2550\u2550\u2550\u2550\nINDEX",
    "bg": "#000a02"
  },
  {
    "id": "S1E3_A9",
    "arcId": 9,
    "n": 3,
    "title": "Functions & Logic \u2014 Building Reusable Tools",
    "description": "A function is a named block of code you can call whenever you need it \u2014 like saving a recipe so you can cook the same dish any time. This episode teaches you how to write functions that take inputs and return outputs, how to use conditionals to choose between different paths, and how a function can even call itself (recursion) to solve problems defined in terms of smaller versions of themselves.",
    "type": "ctf",
    "min": 25,
    "xp": 100,
    "done": false,
    "art": "\u25c9 FUNC\n\u2550\u2550\u2550\u2550\u2550\u2550\nRETURN",
    "bg": "#000a02"
  },
  {
    "id": "S1E4_A9",
    "arcId": 9,
    "n": 4,
    "title": "Lists & Searching \u2014 Working with Collections",
    "description": "A list (also called an array) stores many values in a single variable, each with its own position number. This episode teaches you how to create lists, access items by index, loop over every element, and search for things inside a collection. These skills underpin almost every real-world program ever written.",
    "type": "ctf",
    "min": 25,
    "xp": 100,
    "done": false,
    "art": "\u25c9 LIST\n\u2550\u2550\u2550\u2550\u2550\u2550\nSEARCH",
    "bg": "#000a02"
  }
];
