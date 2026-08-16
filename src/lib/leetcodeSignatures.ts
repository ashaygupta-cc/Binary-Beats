/**
 * Provides standard LeetCode C++ function signatures and class Solution starter templates.
 */

export function getLeetCodeStarterCode(key: string, title?: string): string {
  const slug = key.toLowerCase().replace(/^lc-/, "").trim();

  const map: Record<string, string> = {
    "two-sum": `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        
    }
};`,

    "palindrome-number": `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    bool isPalindrome(int x) {
        
    }
};`,

    "roman-to-integer": `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int romanToInt(string s) {
        
    }
};`,

    "longest-common-prefix": `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string longestCommonPrefix(vector<string>& strs) {
        
    }
};`,

    "valid-parentheses": `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    bool isValid(string s) {
        
    }
};`,

    "merge-two-sorted-lists": `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {
        
    }
};`,

    "remove-duplicates-from-sorted-array": `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int removeDuplicates(vector<int>& nums) {
        
    }
};`,

    "remove-element": `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int removeElement(vector<int>& nums, int val) {
        
    }
};`,

    "find-the-index-of-the-first-occurrence-in-a-string": `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int strStr(string haystack, string needle) {
        
    }
};`,

    "search-insert-position": `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int searchInsert(vector<int>& nums, int target) {
        
    }
};`,

    "length-of-last-word": `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int lengthOfLastWord(string s) {
        
    }
};`,

    "plus-one": `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> plusOne(vector<int>& digits) {
        
    }
};`,

    "add-binary": `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string addBinary(string a, string b) {
        
    }
};`,

    "sqrtx": `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int mySqrt(int x) {
        
    }
};`,

    "climbing-stairs": `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int climbStairs(int n) {
        
    }
};`,

    "best-time-to-buy-and-sell-stock": `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int maxProfit(vector<int>& prices) {
        
    }
};`,

    "valid-palindrome": `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    bool isPalindrome(string s) {
        
    }
};`,

    "single-number": `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int singleNumber(vector<int>& nums) {
        
    }
};`,

    "linked-list-cycle": `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    bool hasCycle(ListNode *head) {
        
    }
};`,

    "reverse-linked-list": `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    ListNode* reverseList(ListNode* head) {
        
    }
};`,

    "add-two-numbers": `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    ListNode* addTwoNumbers(ListNode* l1, ListNode* l2) {
        
    }
};`,

    "longest-substring-without-repeating-characters": `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        
    }
};`,

    "median-of-two-sorted-arrays": `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    double findMedianSortedArrays(vector<int>& nums1, vector<int>& nums2) {
        
    }
};`,

    "longest-palindromic-substring": `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string longestPalindrome(string s) {
        
    }
};`,

    "container-with-most-water": `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int maxArea(vector<int>& height) {
        
    }
};`,

    "3sum": `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<vector<int>> threeSum(vector<int>& nums) {
        
    }
};`,

    "maximum-subarray": `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int maxSubArray(vector<int>& nums) {
        
    }
};`,

    "trapping-rain-water": `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int trap(vector<int>& height) {
        
    }
};`,

    "multiply-strings": `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string multiply(string num1, string num2) {
        
    }
};`,

    "find-the-lexicographically-smallest-valid-sequence": `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> validSequence(string word1, string word2) {
        
    }
};`,

    "stone-game-iv": `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    bool winnerSquareGame(int n) {
        
    }
};`,

    "unique-paths": `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int uniquePaths(int m, int n) {
        
    }
};`,

    "unique-paths-ii": `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int uniquePathsWithObstacles(vector<vector<int>>& obstacleGrid) {
        
    }
};`,

    "container-with-most-water": `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int maxArea(vector<int>& height) {
        
    }
};`,

    "climbing-stairs": `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int climbStairs(int n) {
        
    }
};`,

    "coin-change": `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int coinChange(vector<int>& coins, int amount) {
        
    }
};`,

    "house-robber": `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int rob(vector<int>& nums) {
        
    }
};`
  };

  if (map[slug]) return map[slug];

  // Derive camelCase method name from slug
  const camelCase = slug
    .split("-")
    .map((word, index) => (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join("");

  return `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    // Write your solution for ${title || slug} here
    int ${camelCase}(/* parameters */) {
        
    }
};`;
}
