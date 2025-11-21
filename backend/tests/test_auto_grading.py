import pytest
import json
from datetime import datetime, timezone
from uuid import uuid4
from app import models, schemas, crud


class TestAutoGrading:
    """Test suite for auto-grading logic."""
    
    def test_single_choice_correct_answer(self, test_db):
        """Test auto-grading for single choice with correct answer."""
        # Arrange
        question = models.Question(
            title="Capital of France?",
            complexity="easy",
            type="single_choice",
            options=["Paris", "London", "Berlin"],
            correct_answers="Paris",
            max_score=1
        )
        test_db.add(question)
        test_db.commit()
        
        exam = models.Exam(
            title="Test Exam",
            start_time=datetime.now(timezone.utc),
            end_time=datetime.now(timezone.utc),
            duration_minutes=60,
            is_published=True,
            target_candidates="SSC"
        )
        exam.questions.append(question)
        test_db.add(exam)
        test_db.commit()
        
        student = models.User(
            email="student@test.com",
            hashed_password="hashed",
            role="student",
            full_name="Test Student",
            exam_candidate="SSC"
        )
        test_db.add(student)
        test_db.commit()
        
        attempt = models.ExamAttempt(
            exam_id=exam.id,
            student_id=student.id,
            start_time=datetime.now(timezone.utc)
        )
        test_db.add(attempt)
        test_db.commit()
        
        answer = models.Answer(
            attempt_id=attempt.id,
            question_id=question.id,
            answer_data="Paris"  # Correct answer
        )
        test_db.add(answer)
        test_db.commit()
        
        # Act
        result = crud.calculate_and_save_score(test_db, attempt)
        
        # Assert
        assert result.score == 1.0
        assert result.total_possible_score == 1.0
        assert result.end_time is not None
    
    
    def test_single_choice_incorrect_answer(self, test_db):
        """Test auto-grading for single choice with incorrect answer."""
        # Arrange
        question = models.Question(
            title="Capital of France?",
            complexity="easy",
            type="single_choice",
            options=["Paris", "London", "Berlin"],
            correct_answers="Paris",
            max_score=1
        )
        test_db.add(question)
        test_db.commit()
        
        exam = models.Exam(
            title="Test Exam",
            start_time=datetime.now(timezone.utc),
            end_time=datetime.now(timezone.utc),
            duration_minutes=60,
            is_published=True
        )
        exam.questions.append(question)
        test_db.add(exam)
        test_db.commit()
        
        student = models.User(
            email="student2@test.com",
            hashed_password="hashed",
            role="student"
        )
        test_db.add(student)
        test_db.commit()
        
        attempt = models.ExamAttempt(
            exam_id=exam.id,
            student_id=student.id,
            start_time=datetime.now(timezone.utc)
        )
        test_db.add(attempt)
        test_db.commit()
        
        answer = models.Answer(
            attempt_id=attempt.id,
            question_id=question.id,
            answer_data="London"  # Incorrect answer
        )
        test_db.add(answer)
        test_db.commit()
        
        # Act
        result = crud.calculate_and_save_score(test_db, attempt)
        
        # Assert
        assert result.score == 0.0
        assert result.total_possible_score == 1.0
    
    
    def test_multi_choice_all_correct(self, test_db):
        """Test auto-grading for multi-choice with all correct answers."""
        # Arrange
        question = models.Question(
            title="Which are planets?",
            complexity="medium",
            type="multi_choice",
            options=["Earth", "Sun", "Mars", "Moon"],
            correct_answers=["Earth", "Mars"],
            max_score=2
        )
        test_db.add(question)
        test_db.commit()
        
        exam = models.Exam(
            title="Test Exam",
            start_time=datetime.now(timezone.utc),
            end_time=datetime.now(timezone.utc),
            duration_minutes=60,
            is_published=True
        )
        exam.questions.append(question)
        test_db.add(exam)
        test_db.commit()
        
        student = models.User(
            email="student3@test.com",
            hashed_password="hashed",
            role="student"
        )
        test_db.add(student)
        test_db.commit()
        
        attempt = models.ExamAttempt(
            exam_id=exam.id,
            student_id=student.id,
            start_time=datetime.now(timezone.utc)
        )
        test_db.add(attempt)
        test_db.commit()
        
        answer = models.Answer(
            attempt_id=attempt.id,
            question_id=question.id,
            answer_data=["Earth", "Mars"]  # All correct
        )
        test_db.add(answer)
        test_db.commit()
        
        # Act
        result = crud.calculate_and_save_score(test_db, attempt)
        
        # Assert
        assert result.score == 2.0
        assert result.total_possible_score == 2.0
    
    
    def test_multi_choice_partial_correct(self, test_db):
        """Test auto-grading for multi-choice with partial answers (should fail)."""
        # Arrange
        question = models.Question(
            title="Which are planets?",
            complexity="medium",
            type="multi_choice",
            options=["Earth", "Sun", "Mars", "Moon"],
            correct_answers=["Earth", "Mars"],
            max_score=2
        )
        test_db.add(question)
        test_db.commit()
        
        exam = models.Exam(
            title="Test Exam",
            start_time=datetime.now(timezone.utc),
            end_time=datetime.now(timezone.utc),
            duration_minutes=60,
            is_published=True
        )
        exam.questions.append(question)
        test_db.add(exam)
        test_db.commit()
        
        student = models.User(
            email="student4@test.com",
            hashed_password="hashed",
            role="student"
        )
        test_db.add(student)
        test_db.commit()
        
        attempt = models.ExamAttempt(
            exam_id=exam.id,
            student_id=student.id,
            start_time=datetime.now(timezone.utc)
        )
        test_db.add(attempt)
        test_db.commit()
        
        answer = models.Answer(
            attempt_id=attempt.id,
            question_id=question.id,
            answer_data=["Earth"]  # Only partial - should not score
        )
        test_db.add(answer)
        test_db.commit()
        
        # Act
        result = crud.calculate_and_save_score(test_db, attempt)
        
        # Assert
        assert result.score == 0.0  # Multi-choice requires ALL correct
        assert result.total_possible_score == 2.0
    
    
    def test_multi_choice_wrong_answers(self, test_db):
        """Test auto-grading for multi-choice with wrong answers."""
        # Arrange
        question = models.Question(
            title="Which are planets?",
            complexity="medium",
            type="multi_choice",
            options=["Earth", "Sun", "Mars", "Moon"],
            correct_answers=["Earth", "Mars"],
            max_score=2
        )
        test_db.add(question)
        test_db.commit()
        
        exam = models.Exam(
            title="Test Exam",
            start_time=datetime.now(timezone.utc),
            end_time=datetime.now(timezone.utc),
            duration_minutes=60,
            is_published=True
        )
        exam.questions.append(question)
        test_db.add(exam)
        test_db.commit()
        
        student = models.User(
            email="student5@test.com",
            hashed_password="hashed",
            role="student"
        )
        test_db.add(student)
        test_db.commit()
        
        attempt = models.ExamAttempt(
            exam_id=exam.id,
            student_id=student.id,
            start_time=datetime.now(timezone.utc)
        )
        test_db.add(attempt)
        test_db.commit()
        
        answer = models.Answer(
            attempt_id=attempt.id,
            question_id=question.id,
            answer_data=["Sun", "Moon"]  # All wrong
        )
        test_db.add(answer)
        test_db.commit()
        
        # Act
        result = crud.calculate_and_save_score(test_db, attempt)
        
        # Assert
        assert result.score == 0.0
        assert result.total_possible_score == 2.0
    
    
    def test_mixed_question_types_auto_grade_only_objective(self, test_db):
        """Test auto-grading with mixed question types (only objective grades)."""
        # Arrange - Create multiple questions
        q1 = models.Question(
            title="Single choice",
            complexity="easy",
            type="single_choice",
            options=["A", "B", "C"],
            correct_answers="A",
            max_score=1
        )
        q2 = models.Question(
            title="Text question",
            complexity="medium",
            type="text",
            options=None,
            correct_answers=None,
            max_score=2
        )
        q3 = models.Question(
            title="Multi choice",
            complexity="medium",
            type="multi_choice",
            options=["X", "Y", "Z"],
            correct_answers=["X", "Z"],
            max_score=2
        )
        test_db.add_all([q1, q2, q3])
        test_db.commit()
        
        exam = models.Exam(
            title="Mixed Exam",
            start_time=datetime.now(timezone.utc),
            end_time=datetime.now(timezone.utc),
            duration_minutes=60,
            is_published=True
        )
        exam.questions.extend([q1, q2, q3])
        test_db.add(exam)
        test_db.commit()
        
        student = models.User(
            email="student6@test.com",
            hashed_password="hashed",
            role="student"
        )
        test_db.add(student)
        test_db.commit()
        
        attempt = models.ExamAttempt(
            exam_id=exam.id,
            student_id=student.id,
            start_time=datetime.now(timezone.utc)
        )
        test_db.add(attempt)
        test_db.commit()
        
        # Add answers
        answer1 = models.Answer(
            attempt_id=attempt.id,
            question_id=q1.id,
            answer_data="A"  # Correct
        )
        answer2 = models.Answer(
            attempt_id=attempt.id,
            question_id=q2.id,
            answer_data="Some text"  # Text - won't be auto-graded
        )
        answer3 = models.Answer(
            attempt_id=attempt.id,
            question_id=q3.id,
            answer_data=["X", "Z"]  # Correct
        )
        test_db.add_all([answer1, answer2, answer3])
        test_db.commit()
        
        # Act
        result = crud.calculate_and_save_score(test_db, attempt)
        
        # Assert
        # Should score: q1 (1) + q3 (2) = 3, total = 1 + 2 + 2 = 5
        assert result.score == 3.0
        assert result.total_possible_score == 5.0
    
    
    def test_image_upload_not_auto_graded(self, test_db):
        """Test that image upload questions are not auto-graded."""
        # Arrange
        question = models.Question(
            title="Upload image",
            complexity="medium",
            type="image_upload",
            options=None,
            correct_answers=None,
            max_score=3
        )
        test_db.add(question)
        test_db.commit()
        
        exam = models.Exam(
            title="Image Exam",
            start_time=datetime.now(timezone.utc),
            end_time=datetime.now(timezone.utc),
            duration_minutes=60,
            is_published=True
        )
        exam.questions.append(question)
        test_db.add(exam)
        test_db.commit()
        
        student = models.User(
            email="student7@test.com",
            hashed_password="hashed",
            role="student"
        )
        test_db.add(student)
        test_db.commit()
        
        attempt = models.ExamAttempt(
            exam_id=exam.id,
            student_id=student.id,
            start_time=datetime.now(timezone.utc)
        )
        test_db.add(attempt)
        test_db.commit()
        
        answer = models.Answer(
            attempt_id=attempt.id,
            question_id=question.id,
            answer_data={"name": "image.png", "size": 12345}
        )
        test_db.add(answer)
        test_db.commit()
        
        # Act
        result = crud.calculate_and_save_score(test_db, attempt)
        
        # Assert
        # Image upload not auto-graded, only total_possible_score counted
        assert result.score == 0.0
        assert result.total_possible_score == 3.0
    
    
    def test_unanswered_questions_dont_score(self, test_db):
        """Test that unanswered questions don't contribute to score."""
        # Arrange
        q1 = models.Question(
            title="Question 1",
            complexity="easy",
            type="single_choice",
            options=["A", "B"],
            correct_answers="A",
            max_score=1
        )
        q2 = models.Question(
            title="Question 2",
            complexity="easy",
            type="single_choice",
            options=["A", "B"],
            correct_answers="A",
            max_score=1
        )
        test_db.add_all([q1, q2])
        test_db.commit()
        
        exam = models.Exam(
            title="Test Exam",
            start_time=datetime.now(timezone.utc),
            end_time=datetime.now(timezone.utc),
            duration_minutes=60,
            is_published=True
        )
        exam.questions.extend([q1, q2])
        test_db.add(exam)
        test_db.commit()
        
        student = models.User(
            email="student8@test.com",
            hashed_password="hashed",
            role="student"
        )
        test_db.add(student)
        test_db.commit()
        
        attempt = models.ExamAttempt(
            exam_id=exam.id,
            student_id=student.id,
            start_time=datetime.now(timezone.utc)
        )
        test_db.add(attempt)
        test_db.commit()
        
        # Only answer first question
        answer1 = models.Answer(
            attempt_id=attempt.id,
            question_id=q1.id,
            answer_data="A"  # Correct
        )
        test_db.add(answer1)
        test_db.commit()
        
        # Act
        result = crud.calculate_and_save_score(test_db, attempt)
        
        # Assert
        assert result.score == 1.0  # Only 1 answered and correct
        assert result.total_possible_score == 2.0  # Both questions possible
    
    
    def test_custom_max_score_calculation(self, test_db):
        """Test auto-grading with custom max_score values."""
        # Arrange
        q1 = models.Question(
            title="Worth 5 points",
            complexity="easy",
            type="single_choice",
            options=["A", "B"],
            correct_answers="A",
            max_score=5
        )
        q2 = models.Question(
            title="Worth 10 points",
            complexity="medium",
            type="single_choice",
            options=["A", "B"],
            correct_answers="A",
            max_score=10
        )
        test_db.add_all([q1, q2])
        test_db.commit()
        
        exam = models.Exam(
            title="Custom Score Exam",
            start_time=datetime.now(timezone.utc),
            end_time=datetime.now(timezone.utc),
            duration_minutes=60,
            is_published=True
        )
        exam.questions.extend([q1, q2])
        test_db.add(exam)
        test_db.commit()
        
        student = models.User(
            email="student9@test.com",
            hashed_password="hashed",
            role="student"
        )
        test_db.add(student)
        test_db.commit()
        
        attempt = models.ExamAttempt(
            exam_id=exam.id,
            student_id=student.id,
            start_time=datetime.now(timezone.utc)
        )
        test_db.add(attempt)
        test_db.commit()
        
        answer1 = models.Answer(
            attempt_id=attempt.id,
            question_id=q1.id,
            answer_data="A"  # Correct
        )
        answer2 = models.Answer(
            attempt_id=attempt.id,
            question_id=q2.id,
            answer_data="B"  # Incorrect
        )
        test_db.add_all([answer1, answer2])
        test_db.commit()
        
        # Act
        result = crud.calculate_and_save_score(test_db, attempt)
        
        # Assert
        assert result.score == 5.0  # Only first question correct
        assert result.total_possible_score == 15.0  # 5 + 10
    
    
    def test_answer_with_numeric_comparison(self, test_db):
        """Test auto-grading with numeric string comparisons."""
        # Arrange
        question = models.Question(
            title="What is 2+2?",
            complexity="easy",
            type="single_choice",
            options=["3", "4", "5"],
            correct_answers="4",
            max_score=1
        )
        test_db.add(question)
        test_db.commit()
        
        exam = models.Exam(
            title="Math Exam",
            start_time=datetime.now(timezone.utc),
            end_time=datetime.now(timezone.utc),
            duration_minutes=60,
            is_published=True
        )
        exam.questions.append(question)
        test_db.add(exam)
        test_db.commit()
        
        student = models.User(
            email="student10@test.com",
            hashed_password="hashed",
            role="student"
        )
        test_db.add(student)
        test_db.commit()
        
        attempt = models.ExamAttempt(
            exam_id=exam.id,
            student_id=student.id,
            start_time=datetime.now(timezone.utc)
        )
        test_db.add(attempt)
        test_db.commit()
        
        answer = models.Answer(
            attempt_id=attempt.id,
            question_id=question.id,
            answer_data="4"  # Numeric as string
        )
        test_db.add(answer)
        test_db.commit()
        
        # Act
        result = crud.calculate_and_save_score(test_db, attempt)
        
        # Assert
        assert result.score == 1.0
    
    
    def test_attempt_end_time_is_set_on_submit(self, test_db):
        """Test that attempt end_time is set when submitting."""
        # Arrange
        question = models.Question(
            title="Test",
            complexity="easy",
            type="single_choice",
            options=["A"],
            correct_answers="A",
            max_score=1
        )
        test_db.add(question)
        test_db.commit()
        
        exam = models.Exam(
            title="Test",
            start_time=datetime.now(timezone.utc),
            end_time=datetime.now(timezone.utc),
            duration_minutes=60,
            is_published=True
        )
        exam.questions.append(question)
        test_db.add(exam)
        test_db.commit()
        
        student = models.User(
            email="student11@test.com",
            hashed_password="hashed",
            role="student"
        )
        test_db.add(student)
        test_db.commit()
        
        attempt = models.ExamAttempt(
            exam_id=exam.id,
            student_id=student.id,
            start_time=datetime.now(timezone.utc),
            end_time=None
        )
        test_db.add(attempt)
        test_db.commit()
        
        assert attempt.end_time is None
        
        # Act
        result = crud.calculate_and_save_score(test_db, attempt)
        
        # Assert
        assert result.end_time is not None
    
    
    def test_multi_choice_case_sensitive_comparison(self, test_db):
        """Test multi-choice with case-sensitive answer comparison."""
        # Arrange
        question = models.Question(
            title="Which are correct?",
            complexity="medium",
            type="multi_choice",
            options=["Option_A", "Option_B", "Option_C"],
            correct_answers=["Option_A", "Option_C"],
            max_score=2
        )
        test_db.add(question)
        test_db.commit()
        
        exam = models.Exam(
            title="Case Test",
            start_time=datetime.now(timezone.utc),
            end_time=datetime.now(timezone.utc),
            duration_minutes=60,
            is_published=True
        )
        exam.questions.append(question)
        test_db.add(exam)
        test_db.commit()
        
        student = models.User(
            email="student12@test.com",
            hashed_password="hashed",
            role="student"
        )
        test_db.add(student)
        test_db.commit()
        
        attempt = models.ExamAttempt(
            exam_id=exam.id,
            student_id=student.id,
            start_time=datetime.now(timezone.utc)
        )
        test_db.add(attempt)
        test_db.commit()
        
        answer = models.Answer(
            attempt_id=attempt.id,
            question_id=question.id,
            answer_data=["Option_A", "Option_C"]  # Exact match
        )
        test_db.add(answer)
        test_db.commit()
        
        # Act
        result = crud.calculate_and_save_score(test_db, attempt)
        
        # Assert
        assert result.score == 2.0
