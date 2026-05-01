# Firestore Database Schema

## Collections

### `exams`
| Field | Type | Description |
|-------|------|-------------|
| title | string | Exam title |
| course_code | string | Course code |
| duration | number | Duration in minutes |
| date_time | string (ISO) | Scheduled date/time |
| passing_marks | number | Passing score percentage (default: 40) |
| status | string | Status ('Upcoming', 'Active') |
| created_at | string (ISO) | Creation timestamp |

### `questions`
| Field | Type | Description |
|-------|------|-------------|
| exam_id | string | Reference to exam document ID |
| question_text | string | Question text |
| option_a | string | Option A text |
| option_b | string | Option B text |
| option_c | string | Option C text |
| option_d | string | Option D text |
| correct_option | string | Correct option ('A', 'B', 'C', or 'D') |
| created_at | string (ISO) | Creation timestamp |

### `exam_results`
| Field | Type | Description |
|-------|------|-------------|
| exam_id | string | Reference to exam document ID |
| score | number | Score percentage |
| passed | boolean | Whether the student passed |
| user_email | string | Student email |
| student_name | string | Student name |
| answers | map | Answer map { "questionId": { "val": "A", "time": 5 } } |
| created_at | string (ISO) | Creation timestamp |

## Firestore Security Rules (Recommended for Production)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Exams: Anyone can read, only authenticated users can write
    match /exams/{examId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Questions: Anyone can read, only authenticated users can write
    match /questions/{questionId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Results: Anyone can read, only authenticated users can write
    match /exam_results/{resultId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## Required Firestore Indexes

The following composite indexes need to be created in the Firebase Console:

1. **questions** collection:
   - `exam_id` (Ascending) + `created_at` (Ascending)

These indexes will be auto-prompted by Firebase when a query requires them.
