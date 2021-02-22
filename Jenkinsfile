pipeline {
    agent { dockerfile true }
    stages {
	    stage('Build') {
            steps {
                echo 'Building Image ....'
            }
        }
		
        stage('Test') {
            steps {
                sh 'node --version'
            }
        }
		
		stage('Deploy') {
            steps {
                echo 'Deploying ....'
				sh './runDocker.sh'
            }
        }
    }
}