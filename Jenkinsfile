pipeline {
    agent any
    stages {
        stage('Test') {
            steps {
				echo 'In Test Stage ...nothing to test yet'
            }
        }
		stage('Test') {
            steps {
				sh 'docker-compose build'
				sh 'docker-compose up -d'
            }
        }
    }
}