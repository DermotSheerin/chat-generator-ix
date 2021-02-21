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
				docker run -it -d -p 8000:8000 9e6c6317113a689b19aa5478a0c05582ba646526:latest
            }
        }
    }
}