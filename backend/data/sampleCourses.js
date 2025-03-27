const sampleCourses = [
  {
    title: 'Data Structures & Algorithms',
    description: 'Master fundamental data structures and algorithmic techniques essential for competitive programming. Learn arrays, linked lists, trees, graphs, and more.',
    image: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
    courseLink: 'https://example.com/dsa',
    instructor: 'Dr. Jane Smith',
    level: 'Intermediate',
    category: 'algorithms',
    duration: '8 weeks',
    students: 1245,
    rating: 4.7,
    topics: ['Arrays', 'Linked Lists', 'Trees', 'Graphs', 'Sorting', 'Searching'],
    prerequisites: ['Basic programming knowledge', 'Understanding of time complexity']
  },
  {
    title: 'Dynamic Programming Masterclass',
    description: 'Learn advanced problem-solving techniques using dynamic programming approaches. Perfect for competitive programming and technical interviews.',
    image: 'https://images.unsplash.com/photo-1551033406-611cf9a28f67?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
    courseLink: 'https://example.com/dp',
    instructor: 'Prof. Michael Chen',
    level: 'Advanced',
    category: 'algorithms',
    duration: '6 weeks',
    students: 892,
    rating: 4.9,
    topics: ['Memoization', 'Tabulation', 'State Transitions', 'Optimization'],
    prerequisites: ['Data Structures', 'Algorithms', 'Recursion']
  },
  {
    title: 'Graph Algorithms & Network Flow',
    description: 'Explore graph theory and algorithms commonly used in competitive programming contests. Master DFS, BFS, Dijkstra, and network flow problems.',
    image: 'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
    courseLink: 'https://example.com/graphs',
    instructor: 'Dr. Alex Johnson',
    level: 'Intermediate',
    category: 'algorithms',
    duration: '7 weeks',
    students: 1056,
    rating: 4.6,
    topics: ['DFS', 'BFS', 'Shortest Paths', 'Minimum Spanning Trees', 'Network Flow'],
    prerequisites: ['Basic graph theory', 'Data structures']
  },
  {
    title: 'Competitive Programming Techniques',
    description: 'Learn strategies and techniques to excel in competitive programming contests like ICPC, Google Code Jam, and Codeforces.',
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
    courseLink: 'https://example.com/competitive',
    instructor: 'Sarah Williams',
    level: 'All Levels',
    category: 'competitive',
    duration: '10 weeks',
    students: 2134,
    rating: 4.8,
    topics: ['Contest Strategies', 'Problem Analysis', 'Time Management', 'Common Patterns'],
    prerequisites: ['Basic programming', 'Problem-solving aptitude']
  },
  {
    title: 'Advanced Data Structures',
    description: 'Deep dive into complex data structures like segment trees, Fenwick trees, and suffix arrays used in competitive programming.',
    image: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
    courseLink: 'https://example.com/advanced-ds',
    instructor: 'Prof. Robert Lee',
    level: 'Advanced',
    category: 'data-structures',
    duration: '8 weeks',
    students: 765,
    rating: 4.5,
    topics: ['Segment Trees', 'Fenwick Trees', 'Suffix Arrays', 'Tries', 'Sparse Tables'],
    prerequisites: ['Basic data structures', 'Algorithms']
  },
  {
    title: 'Problem Solving Patterns',
    description: 'Master common problem-solving patterns and techniques to tackle a wide range of competitive programming challenges.',
    image: 'https://images.unsplash.com/photo-1509966756634-9c23dd6e6815?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
    courseLink: 'https://example.com/patterns',
    instructor: 'Emily Zhang',
    level: 'Intermediate',
    category: 'problem-solving',
    duration: '6 weeks',
    students: 1532,
    rating: 4.7,
    topics: ['Greedy Algorithms', 'Divide and Conquer', 'Backtracking', 'Two Pointers'],
    prerequisites: ['Basic algorithms', 'Problem-solving experience']
  }
];

module.exports = sampleCourses; 